interface IxAssocRecord {
	key: string;
	value: any;
}
export class IxAssoc {

	private data: IxAssocRecord[];
	private keyIx: any;

	constructor(){
		this.data = [];
		this.keyIx = {};
	}
	
	public empty(){
		this.data = [];
		this.keyIx = {};
	}
	
	public set( key: string, value: any ){
		if( typeof this.keyIx[ key ] !== 'undefined' ){
			let prevValue = this.get( key );
			this.data[ this.keyIx[ key ] ] = {
				key: key,
				value: value
			};
			return prevValue;
		}else{
			this.keyIx[ key ] = this.data.length;
			this.data.push( {
				key: key,
				value: value
			} );
			return;
		}
	}
	public get( key: string ){
		if( typeof this.keyIx[ key ] !== 'undefined' ){
			return this.keyIx[ key ].data;
		}else{
			return;
		}
	}
	public unset( key: string ){
		if( typeof this.keyIx[ key ] !== 'undefined' ){
			let prevValue = this.get( key );
			
			this.data.splice( this.keyIx[ key ], 1 );
			delete this.keyIx[ key ];
			
			this.keyIx = {};
			let lastIx = 0;
			this.data.forEach( (i) => {
				this.keyIx[ i.key ] = lastIx++;
			} );
			
			return prevValue;
		}else{
			return;
		}
	}
	public count(){
		return this.data.length;
	}
	public exists( key: string ){
		return typeof this.keyIx[ key ] !== 'undefined';
	}
	public foreach( f: Function ){
		for( let i = 0; i < this.data.length; i++ ){
			if( f( this.data[i].key, this.data[i].value ) === false ) break;
		}
	}
	public reduce( f: Function, initialValue: any ){
		let lastval = initialValue;
		for( let i = 0; i < this.data.length; i++ ){
			lastval = f( lastval, this.data[i].key, this.data[i].value );
		}
		return lastval;
	}
	public values(){
		return this.data.map( (r) => r.value );
	}
	public keys(){
		return this.data.map( (r) => r.key );
	}
}
