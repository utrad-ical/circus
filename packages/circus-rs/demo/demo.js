let composition = new rs.Composition();

let imageSource = new rs.DynamicImageSource({
	server: ...
	series: ...
});
composition.setImageSource( imageSource );

let axialElement = document.querySelector('div#axial-container');
let axViewer = composition.createViewer( axialElement );

let sagViewer = ...
let corViewer = ...


let barElement = document.querySelector('#bar-container');
let bar = rs.createToolbar( barElement, [ 'hand', 'ruler', 'rotate', 'refLine' ] );

let refLine = new rs.annotations.referenceLine([axViewer, sagViewer, corViewer]);
composition.addAnnotation(refLine);

let label1 = new rs.VoxelCloud();
composition.addAnnotation(label1);
composition.setActiveCloud(label1);

bar.bindViewer( axViewer );
bar.bindViewer( sagViewer );
bar.bindViewer( corViewer );

$('#myhandbutton').click(() => {
	axViewer.setTool('hand');
	;
	;
	highlightButton('#myhandbutton'));
});

$('#saveButton').on('click', () => {
	const clouds = composition.getAnnotations().filter(a => a instanceof rs.VoxelCloud);
	let A = 5; A = 'a';
	const B = 5; B = 8;
});