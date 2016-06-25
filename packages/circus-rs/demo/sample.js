$(function() {

	$('#use-button').on('click', function() {
		localStorage.setItem('rs-demo-save', JSON.stringify({
			server: $('#server').val(),
			series: $('#series').val(),
			source: $('#source').val()
		}));
		window.location.reload();
	});

	var config = (function() {
		var config = JSON.parse(localStorage.getItem('rs-demo-save'));
		if (config) {
			$('#series').val(config.series);
			$('#server').val(config.server);
			$('#source').val(config.source);
			return config;
		} else {
			return null;
		}
	})();

	if (config && config.server && config.series && config.source) rs(config);
});

function rs(config) {
	var composition = new circusrs.Composition();

	var toolbar = circusrs.createToolbar(
		document.querySelector('div#rs-toolbar'),
		['Window', 'Hand', 'CelestialRotate',
			'Brush', 'Eraser', 'Bucket',
			'Ruler', 'Arrow', 'Cube',
			'ReferenceRotate', 'ReferenceMove',
			'Undo', 'Redo']
	);
	toolbar.bindComposition(composition);

	/**
	 * image source
	 */
	switch (config.source) {
		case "mock":
			var imageSource = new circusrs.MockImageSource({
				voxelCount: [512, 512, 419],
				voxelSize: [0.572265625, 0.572265625, 1]
			});
			break;
		case "dynamic":
			var imageSource = new circusrs.DynamicImageSource(config);
			break;
		case "raw-volume":
			var imageSource = new circusrs.RawVolumeImageSource(config);
			break;
		case "hybrid":
			var imageSource = new circusrs.HybridImageSource(config);
			break;
		case "raw-volume-with-mock":
			var imageSource = new circusrs.RawVolumeImageSourceWithMock(config);
			break;
	}

	composition.setImageSource(imageSource);

	var axViewer = composition.createViewer(document.querySelector('div#rs-axial'), { stateName: 'axial' });
	var sagViewer = composition.createViewer(document.querySelector('div#rs-sagittal'), { stateName: 'sagittal' });
	var corViewer = composition.createViewer(document.querySelector('div#rs-coronal'), { stateName: 'coronal' });
	var oblViewer = composition.createViewer(document.querySelector('div#rs-oblique'), { stateName: 'oblique' });

	composition.setTool('Hand');

	/**
	 *
	 */

	$('#pen-width').on('input', function(ev) {
		composition.cloudEditor.penWidth = this.value;
	});
	$('[name=reset-celestial]').on('click', function(ev) {
		var t = composition.getTool('CelestialRotate');
		t.resetCelestialState(axViewer);
		t.resetCelestialState(sagViewer);
		t.resetCelestialState(corViewer);
		t.resetCelestialState(oblViewer);
		composition.renderAll();
	});
	$('[name=reset-hand]').on('click', function(ev) {
		var t = composition.getTool('Hand');
		t.resetTranslateState(axViewer);
		t.resetTranslateState(sagViewer);
		t.resetTranslateState(corViewer);
		t.resetTranslateState(oblViewer);
		composition.renderAll();
	});
	$('[name=reset-zoom]').on('click', function(ev) {
		var t = composition.getTool('Hand');
		t.resetZoomState(axViewer);
		t.resetZoomState(sagViewer);
		t.resetZoomState(corViewer);
		t.resetZoomState(oblViewer);
		composition.renderAll();
	});

	imageSource.ready().then(function() {
		var imgState = imageSource.state();
		var dim = imgState.voxelCount;
		var vsize = imgState.voxelSize;
		var cloud = new circusrs.VoxelCloud();
		cloud.label = 'TEST1';
		cloud.color = [0xff, 0, 0, 0x99];
		cloud.setDimension(dim[0], dim[1], dim[2]);
		cloud.setVoxelDimension(vsize[0], vsize[1], vsize[2]);
		composition.clouds.push(cloud);
		composition.editCloud(cloud);

		var test = new Test(composition);
		var funcs = [];
		for (var i in test.__proto__) {
			funcs.push(i);
		}
		funcs.sort(function(a, b) {
			var _a = parseInt(a.substr(1, 2));
			var _b = parseInt(b.substr(1, 2));
			return _a === _b
				? 0
				: ( _a > _b ? 1 : -1);
		});
		$.each(funcs, function(idx, i) {
			$('#draw-test').append(
				$(document.createElement('button')).attr({
					type: 'button',
					class: 'btn btn-default btn-block btn-xs'
				}).append(i.substr(3)).on('click', function() {
					var vName = $('#draw-test select').val();
					switch (vName) {
						case 'axial':
							var v = axViewer;
							break;
						case 'sagittal':
							var v = sagViewer;
							break;
						case 'coronal':
							var v = corViewer;
							break;
						case 'oblique':
							var v = oblViewer;
							break;
					}
					(test[i])(v);
					composition.renderAll();
				})
			);
		});

		composition.renderAll();
	});
}

var Test = (function() {
	var Test = function(composition) {
		this.composition = composition;
		this.editor = composition.cloudEditor;
	};
	Test.prototype._01dumpState = function(viewer) {
		console.log(viewer.dumpState());
	};

	Test.prototype._02tranrate = function(viewer) {
		var c = this.composition;
		var t = c.getTool('Hand');

		var step = this.tranrateFlag ? -1 : 1;
		var count = 100;
		var total = count;

		var start = (new Date()).getTime();
		var moveBit = function() {
			if (count-- > 0) {
				t.translateBy(viewer, [0, step]);
				setTimeout(function() {
					moveBit();
					viewer.render();
				}, 1);
			} else {
				var end = (new Date()).getTime();
				var fr = ( end - start ) / total;
				console.log(fr.toString() + '[ms] per render');
				this.tranrateFlag = !this.tranrateFlag;
			}
		};
		moveBit();
	};

	Test.prototype._03tranrate_a_once = function(viewer) {
		var c = this.composition;
		var t = c.getTool('Hand');
		t.translateBy(viewer, [0, this.tranrateFlag ? -100 : 100]);
		this.tranrateFlag = !this.tranrateFlag;
	};

	Test.prototype._11aline = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());
		// e.line( [50, 50], [250,200] );
		e.line([50, 50], [250, 50]);
	};

	Test.prototype._12lines = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());
		e.line([70, 50], [270, 60]);
		e.line([70, 50], [270, 250]);
		e.line([70, 50], [80, 250]);

		e.line([240, 80], [40, 70]);
		e.line([240, 270], [40, 70]);
		e.line([50, 270], [40, 70]);
	};

	Test.prototype._13radiation = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());
		var o = [150, 150];
		var r = 100;
		var deg = 0;
		while (deg < 90) {
			var rad = deg * Math.PI / 180;
			var p0 = [
				o[0] - r * Math.cos(rad),
				o[1] - r * Math.sin(rad)];
			var p1 = [
				o[0] + r * Math.cos(rad),
				o[1] + r * Math.sin(rad)];
			deg += 10;

			e.line([p0[0], p0[1] - 30], [p1[0], p1[1] - 30]);
			e.line([p1[0], p1[1] + 30], [p0[0], p0[1] + 30]);
		}
	};

	Test.prototype._21fillSection = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());

		e.eachVoxelsOnRect2(100, 100, 100, 100, function(p) {
			e.cloud.writePixelAt(1, Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]));
		});
	};

	Test.prototype._22fillRect = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());
		e.moveTo(100, 100);
		e.lineTo(110, 100);
		e.lineTo(110, 110);
		e.lineTo(100, 110);
		e.lineTo(100, 100);
		e.fill(105, 105);
	};

	Test.prototype._23triangle = function(viewer) {
		var e = this.editor;
		e.prepare(viewer.getState());
		e.moveTo(100, 100);
		e.lineTo(50, 150);
		e.lineTo(150, 150);
		e.lineTo(100, 100);
		e.fill(100, 125);
	};

	Test.prototype._99clear = function(viewer) {
		var state = viewer.getState();
		var e = this.editor;
		e.prepare(state);
// var limit = 500;
		e.eachVoxelsOnRect2(0, 0, viewer.viewState.resolution[0], viewer.viewState.resolution[1], function(p) {

			var pidx = [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])];

// if( limit-- > 0 ) console.log( pidx.toString() );

			if (pidx[0] < 0 || pidx[1] < 0 || pidx[2] < 0
				|| state.voxelCount[0] <= pidx[0]
				|| state.voxelCount[1] <= pidx[1]
				|| state.voxelCount[2] <= pidx[2]
			) {
			} else {
				e.cloud.writePixelAt(0, pidx[0], pidx[1], pidx[2]);
			}
		});
	};


	return Test;
})();
