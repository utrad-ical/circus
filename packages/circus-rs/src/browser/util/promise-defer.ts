
export class PromiseDefer implements Thenable<{}> {
	
	private f: () => Thenable<{}>;
	private q: any[]; // ??? { resolve: Function, reject: Function }[];
	
	private fire: Promise<any>;
	private cancelState: boolean = false;
	private cancelMessage: string;
	
	constructor( f ){
		this.f = f;
		this.q = [];
	}
	
	public then( resolve: Function, reject: Function ) {
		
		if( this.fire ){
			return ( this.fire as any ).then( resolve, reject );
		}else{
			this.q.push({
				resolve: resolve,
				reject: reject
			});
			return this;
		}
	}

	public catch( errorHandler: Function ){

		if( this.fire ){
			return ( this.fire as any ).catch( errorHandler );
		}else{
			this.q.push({
				resolve: null,
				reject: errorHandler
			});
			return this;
		}
	}
	
	public execute(){
		if( this.fire ) return this.fire;
		
		if( this.cancelState ){
			this.fire = Promise.reject( this.cancelMessage );
		}else{
			this.fire = Promise.resolve();
		}
		
		this.fire = this.fire.then( () => this.f() );
		while( this.q.length > 0 ){
			let c = this.q.shift();
			this.fire = this.fire.then( c.resolve, c.reject );
		}
		return this.fire;
	}
	
	public cancel( message: string = 'Canceled', silent: boolean = false ){
		this.cancelState = true;
		this.cancelMessage = message;
		if( !silent ){
			return this.execute();
		}else{
			this.fire = Promise.resolve();
		}
	}
}
