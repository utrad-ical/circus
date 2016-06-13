'use strict';

import { EventEmitter } from 'events';

import { VoxelCloud }						from '../common/VoxelCloud';

import { Painter }						from '../browser/interface/painter';
import { Sprite }						from '../browser/viewer/sprite';
import { ImageSource }					from '../browser/image-source/image-source';
import { Viewer }						from '../browser/viewer/viewer';
import { ViewerEvent }					from '../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../browser/interface/viewer-event-target';

import { Tool }							from '../browser/tool/tool';
import { WindowTool }					from '../browser/tool/state/window';
import { HandTool }						from '../browser/tool/state/hand';
import { CelestialRotateTool }			from '../browser/tool/state/celestial-rotate';
import { CloudsRenderer }				from '../browser/tool/cloud/clouds-renderer';
import { CloudEditor }					from '../browser/tool/cloud/cloud-editor';
import { BrushTool }					from '../browser/tool/cloud/brush';
import { BucketTool }					from '../browser/tool/cloud/bucket';

export class Composition extends EventEmitter {
	
	private imageSource: ImageSource;
	private viewers: Viewer[] = [];
	private painters: Painter[] = [];
	private tools: any = {}; // { name: string => tool: Tool }
	public clouds: VoxelCloud[] = [];

	private currentToolName: string;
	
	private cloudEditor: CloudEditor;
	
	constructor(){
		super();
		
		/**
		 * set up tools
		 */
		
		// window tool
		this.tools['Window'] = new WindowTool();
		
		// hand tool
		this.tools['Hand'] = new HandTool();
		
		// celestial-rotate tool
		this.tools['CelestialRotate'] = new CelestialRotateTool();
		
		//
		// Cloud edit tools
		//
		this.cloudEditor = new CloudEditor();
		
		// brush tool
		let brush = new BrushTool();
		brush.cloudEditor = this.cloudEditor;
		brush.on('penup', () => {
			this.renderAll();
		});
		this.tools['Brush'] = brush
		
		// bucket tool
		let bucket = new BucketTool();
		bucket.cloudEditor = this.cloudEditor;
		bucket.on('filled', () => {
			this.renderAll();
		});
		this.tools['Bucket'] = bucket
		
		/**
		 * set up painter
		 */
		let cloudsRenderer = new CloudsRenderer();
		cloudsRenderer.clouds = this.clouds;
		this.painters.push( cloudsRenderer );
		
	}

	public editCloud( cloud: VoxelCloud ){
		this.cloudEditor.setCloud( cloud );
	}
	
	public setImageSource( imageSource: ImageSource ){
		this.imageSource = imageSource;
		
		let viewers = this.viewers.concat();
		
		imageSource.ready().then( () => {
			viewers.forEach( (v) => {
				v.setSource( imageSource );
				v.render();
			} );
		} );
	}
	
	public createViewer( wrapperElement, option: { stateName?: string, width?: number, height?:number } = {
		stateName: 'axial',
		width: 300,
		height: 300
	} ){

		if( ! this.imageSource ) throw 'ImageSource is not set';
	
		let stateName = typeof option.stateName !== 'undefined' ? option.stateName.toString() : 'axial';
		let width = typeof option.width !== 'undefined' ? option.width.toString() : '300';
		let height = typeof option.height !== 'undefined' ? option.height.toString() : '300';
		
		// Create canvas element
		let canvasElement = document.createElement('canvas');
		canvasElement.setAttribute('width', width);
		canvasElement.setAttribute('height', height);
		canvasElement.style.width = '100%';
		canvasElement.style.height = 'auto';
		wrapperElement.appendChild( canvasElement );
	
		// Create viewer and entry collection.
		let viewer = new Viewer( canvasElement );
		this.viewers.push( viewer );
		
		// Tool ... ?
		if( this.currentToolName ) viewer.backgroundEventTarget = this.tools[this.currentToolName];
		
		// Share painter
		viewer.painters = this.painters;
		
		this.imageSource.ready().then( () => {
			
			// Prepare default view state.
			let state = viewer.getState();
			
			let isState = this.imageSource.state();
			for( let item in isState ){
				state[item] = isState[item];
			}
			
			let dim: [ number, number, number ] = state.voxelCount;
		
			switch( stateName ){
				case 'sagittal':
					state.stateName = 'sagittal';
					this.setSagittal( state );
					break;
				case 'coronal':
					state.stateName = 'coronal';
					this.setCoronal( state );
					break;
				case 'oblique':
					state.stateName = 'oblique';
					this.setAxial( state );
					break;
				case 'axial':
				default:
					state.stateName = 'axial';
					this.setAxial( state );
					break;
			}
			
			if( state.estimateWindow ){
				state.window = state.estimateWindow;
			}

			viewer.setSource( this.imageSource );
			viewer.setState( state );
			
			if( state.stateName === 'oblique' ){
				console.log('OK');
				this.tools['CelestialRotate'].horizontalRotate( viewer, 45 );
				this.tools['CelestialRotate'].verticalRotate( viewer, 45 );
			}
		} );
		
		return viewer;
	}
	
	private setAxial( state ){
		let mmDim = [
			state.voxelCount[0] * state.voxelSize[0],
			state.voxelCount[1] * state.voxelSize[1],
			state.voxelCount[2] * state.voxelSize[2] ];
		
		let aspect = state.viewport[0] / state.viewport[1];
		if( aspect >= 1.0 ){
			state.section = {
				origin : [ 0, -( mmDim[0] - mmDim[1] ) / 2, mmDim[2] / 2 ],
				xAxis : [ mmDim[0], 0, 0 ],
				yAxis : [ 0, mmDim[1] * aspect ,0 ]
			};
		}else{
			state.section = {
				origin : [ -( mmDim[1] - mmDim[0] ) / 2, 0, mmDim[2] / 2 ],
				xAxis : [ mmDim[0] * aspect, 0, 0 ],
				yAxis : [ 0, mmDim[1] ,0 ]
			};
		}
	}
	
	private setSagittal( state ){
		let mmDim = [
			state.voxelCount[0] * state.voxelSize[0],
			state.voxelCount[1] * state.voxelSize[1],
			state.voxelCount[2] * state.voxelSize[2] ];
		
		let aspect = state.viewport[0] / state.viewport[1];
		if( aspect >= 1.0 ){
			state.section = {
				origin : [ mmDim[0] / 2, 0, 0 ],
				xAxis : [ 0, mmDim[1], 0 ],
				yAxis : [ 0, 0 ,mmDim[2] * aspect ]
			};
		}else{// axial
			state.section = {
				origin : [ -( mmDim[1] - mmDim[0] ) / 2, 0, mmDim[2] / 2 ],
				xAxis : [ mmDim[0] * aspect, 0, 0 ],
				yAxis : [ 0, mmDim[1] ,0 ]
			};
		}
	}
	
	private setCoronal( state ){
		let mmDim = [
			state.voxelCount[0] * state.voxelSize[0],
			state.voxelCount[1] * state.voxelSize[1],
			state.voxelCount[2] * state.voxelSize[2] ];
		
		let aspect = state.viewport[0] / state.viewport[1];
		if( aspect >= 1.0 ){
			state.section = {
				origin : [ 0, mmDim[1] / 2, 0 ],
				xAxis : [ mmDim[0], 0, 0 ],
				yAxis : [ 0, 0 ,mmDim[2] * aspect ]
			};
		}else{// axial
			state.section = {
				origin : [ -( mmDim[1] - mmDim[0] ) / 2, 0, mmDim[2] / 2 ],
				xAxis : [ mmDim[0] * aspect, 0, 0 ],
				yAxis : [ 0, mmDim[1] ,0 ]
			};
		}
	}
	
	public renderAll(){
		if( ! this.imageSource ) throw 'ImageSource is not set';
		return this.imageSource.ready().then( () => {
			let p = [];
			this.viewers.forEach( (v) => {
				p.push( v.render() );
			} );
			return Promise.all( p );
		} );
	}

	public setTool( toolName: string ): Tool {
		
		if( this.currentToolName === toolName ){
			return this.tools[ toolName ];
		}
		
		if( typeof this.tools[ toolName ] === 'undefined' )
			throw 'Unknown tool: ' + toolName;
		
		let tool = this.tools[ toolName ];
		
		// bind viewers
		this.viewers.forEach( (v) => {
			v.backgroundEventTarget = this.tools[ toolName ];
		} );
		
		let before = this.currentToolName;
		this.currentToolName = toolName;
		this.emit('toolchange', before, toolName );
		
		return this.tools[ toolName ];
	}
	public getTool( toolName: string ): Tool {
		if( typeof this.tools[ toolName ] === 'undefined' )
			throw 'Unknown tool: ' + toolName;
			
		return this.tools[ toolName ];
	}
	
}
