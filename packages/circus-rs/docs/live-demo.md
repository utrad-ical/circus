---
title: Live Demo
---

# CIRCUS RS Live Demo Test

By clicking the "Run" button, you can try CIRCUS RS functions.

<div class="live-demo" title="Simple Demo">
<pre>
document.getElementById('foobar').innerHTML = Math.random() + '';
</pre>
<div class="result">
	<div id="foobar"></div>
</div>
</div>

<div class="live-demo" title="Test Demo">
<pre>
var viewerDiv = document.getElementById('viewer');
var src = new circusrs.MockImageSource({});

var comp = new circusrs.Composition(src);

var viewer = new circusrs.Viewer(viewerDiv);
viewer.setComposition(comp);
</pre>
<div class="result">
	<div id="viewer"></div>
</div>
</div>
