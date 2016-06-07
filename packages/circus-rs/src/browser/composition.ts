'use strict';

import { EventEmitter } from 'events';

import { VoxelCloud }						from '../common/VoxelCloud';

import { Painter }						from '../browser/interface/painter';
import { Sprite }						from '../browser/viewer/sprite';
import { ImageSource }					from '../browser/image-source/image-source';
import { Viewer }						from '../browser/viewer/viewer';
import { ViewerEvent }					from '../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../browser/interface/viewer-event-target';
import { CrossSection }					from '../browser/interface/cross-section';
import { CrossSectionUtil }				from '../browser/util/cross-section-util';

import { Tool }							from '../browser/tool/tool';
import { HandTool }						from '../browser/tool/state/hand';
import { RotateTool }					from '../browser/tool/state/rotate';
import { BrushTool }					from '../browser/tool/cloud/brush';
import { CloudsRenderer }				from '../browser/tool/cloud/clouds-renderer';
import { CloudEditor }					from '../browser/tool/cloud/cloud-editor';

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
		
		// hand tool
		this.tools['Hand'] = new HandTool();
		
		// rotate tool
		this.tools['Rotate'] = new RotateTool();
		
		//
		// Edit tool
		//
		this.cloudEditor = new CloudEditor();
		
		// brush tool
		let brush = new BrushTool();
		brush.cloudEditor = this.cloudEditor;
		brush.on('penup', () => {
			this.renderAll();
		});
		this.tools['Brush'] = brush
		
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
		'stateName': 'axial',
		'width': 300,
		'height': 300
	} ){

		if( ! this.imageSource ) throw 'ImageSource is not set';
	
		let stateName = typeof option.stateName !== 'undefined' ? option.stateName.toString() : 'axial';
		let width = typeof option.width !== 'undefined' ? option.width.toString() : '300';
		let height = typeof option.height !== 'undefined' ? option.height.toString() : '300';
	
		let canvasElement = document.createElement('canvas');
		canvasElement.setAttribute('width', width);
		canvasElement.setAttribute('height', height);
		canvasElement.style.width = '100%';
		canvasElement.style.height = 'auto';
		
		wrapperElement.appendChild( canvasElement );
	
		let viewer = new Viewer( canvasElement );
		
		if( this.currentToolName ) viewer.backgroundEventTarget = this.tools[this.currentToolName];
		
		this.imageSource.ready().then( () => {
			let section;
			switch( stateName ){
				case 'sagittal':
					section = CrossSectionUtil.getSagittal( this.imageSource.getDimension() );
					break;
				case 'coronal':
					section = CrossSectionUtil.getCoronal( this.imageSource.getDimension() );
					break;
				case 'axial':
				default:
					section = CrossSectionUtil.getAxial( this.imageSource.getDimension() );
					break;
			}
			
			let winConfig = ( this.imageSource as any ).esitimateWindow
				? ( this.imageSource as any ).esitimateWindow()
				: {
					width: 100,
					level: 10
				};
			winConfig.width = winConfig.width || 100;
			winConfig.level = winConfig.level || 10;
			
			viewer.setSource( this.imageSource );
			viewer.setState( {
				section: section,
				width: winConfig
			} );
			
			Promise.resolve( viewer );
		} );
		
		viewer.painters = this.painters;
		this.viewers.push( viewer );
		return viewer;
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
		this.emit('toolchange', this.tools[ before ], this.tools[ toolName ] )
		
		return this.tools[ toolName ];
	}
	
}
