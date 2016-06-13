
export function createToolbar( wrapperElement, toolNames: string[] ) {
	
	let associatedCompositions = [];

	let selectToolHandler = toolName => {
		associatedCompositions.forEach( c => c.setTool( toolName ) );
	};
	
	let ulElement = document.createElement('ul');
	ulElement.className = 'circus-rs-toolbar';
	
	let appendLi = ( toolName ) => {
		let buttonElement = document.createElement('button');
		buttonElement.setAttribute('type', 'button');
		buttonElement.appendChild( document.createTextNode( toolName ) );
		buttonElement.addEventListener( 'click', () => selectToolHandler( toolName ) );

		let liElement = document.createElement('li');
		liElement.className = 'circus-rs-toolbar-item ' + toolName;
		liElement.appendChild( buttonElement );
		
		ulElement.appendChild( liElement );
	};
	
	for( let i = 0; i < toolNames.length; i++ ){
		appendLi( toolNames[i] );
	}
	
	wrapperElement.appendChild( ulElement );
	
	let bindComposition = ( composition ) => {
		composition.on('toolchange', ( before, after ) => {
			if( before ){
				let re = new RegExp( ' ' + before + '-active ', 'g' );
				ulElement.className = ulElement.className.replace( re, '' );
			}
			ulElement.className += ' ' + after + '-active ';
		} );
		associatedCompositions.push( composition );
	};
	
	return {
		bindComposition: bindComposition
	};
}

