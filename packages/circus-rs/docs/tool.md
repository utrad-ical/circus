---
title: Working with Tools
---

# Working with Tools

CIRCUS RSにおけるツールは、各種の臨床画像ビューアや画像編集ソフトウェアにおけるツールと基本的に同じものです。ツールによって、ビューア上でのマウス操作で断面図のページを切り替えたり、画像の拡大・縮小や回転が行えます。

## 最初から用意されているツールクラス

CIRCUS RS にはいくつかのツールクラスがあらかじめ用意されています。これらはCIRCUS RSによって自動で初期化され、デフォルトで利用できます。

| class | 用途 | ツール名 |
|-|-|-|
| HandTool | 手のひらツール | `hand` |
| WindowTool | ウィンドウの設定変更 | `window` |
| ZoomTool | 拡大・縮小 | `zoom` |
| PagerTool | ページング | `pager` |
| CelestialRotate | 天球回転 | `cerestialRotate` |

## ツールの切り替え

ビューアのアクティブなツールは、JavaScriptコードからは以下のようにして切り替えます。

```js
viewer.setActiveTool('hand');
```

利用可能なツール名は上記の表を参照してください。

## ツールバーの作成と利用

CIRCUS RS にはいわゆる「ツールバー」を容易に作成するヘルパと、デフォルトのツールボタンアイコンが含まれています。

このCIRCUS RSのデフォルトのツールバーを使用するかどうかは、完全に任意です。ツールの切り替えのための UI が必要ない場合はツールバーを作成する必要はありません。また、後述するように、開発者は必要に応じて、ツールバーやその他ツール切り替えのための UI を独自に作成するこことができます。また、デフォルトのツールバーの DOM の実体は単純な HTML の `li` 要素ですので、CSSによってある程度のカスタマイズは可能です。

```js
// The list of tool names which you want to display
const toolList = ['mytool', 'hand', 'zoom', 'window'];

// Create the tool bar
const toolbar = circusrs.createToolbar(
    document.getElementById('tool-selector'),
    toolList
);

// Assign one or more Viewers to the tool bar
toolbar.bindViewer(viewer);
```

```html
<div id="tool-selector"></div>
<div id="viewer"></div>
```

## 独自ツールの作成・拡張

Tool は既存のツールクラスを拡張するか、基底クラスである Tool を直接継承することにより作成できます。

ツールは本質的には、ビューア上のUIイベント（特にマウスイベント）に対するハンドラの集まりです。渡されるイベントには、 `viewer` プロパティをはじめ、幾つかの拡張情報が含まれています。

`Tool` クラスは `ViewerEventTarget` インターフェースを実装しており、デフォルトで以下のイベントに対するデフォルト動作を定義しています。現時点で、このうち実際に意味のある動作を行うのは wheelHandler のみです。

```
interface ViewerEventTarget {
    mouseUpHandler: (viewerEvent: ViewerEvent) => any;
    mouseDownHandler: (viewerEvent: ViewerEvent) =>  any;
    mouseMoveHandler: (viewerEvent: ViewerEvent) =>  any;
    dragStartHandler: (viewerEvent: ViewerEvent) =>  any;
    dragHandler: (viewerEvent: ViewerEvent) =>  any;
    dragEndHandler: (viewerEvent: ViewerEvent) =>  any;
    wheelHandler: (viewerEvent: ViewerEvent) =>  any;
}
```

### 例: クリックしたらアラートを出すツールクラスの定義

実際に独自のToolを利用するまでは以下の手順となります。

0. Toolクラスの定義
0. 作成したToolクラスの登録 `registerTool`
0. Toolのアクティブ化

```js
// Define a new tool by extending the Tool class
class MyCustomTool extends circusrs.Tool {
    mouseUpHandler(viewerEvent) {
        // viewerEvent holds various information
        // as well as the original MouseEvent made by the browser
        alert('Hello CIRCUS RS Tool!');
    };
}

// You have to register your custom tool class before using it
circusrs.registerTool('mytool', MyCustomTool);

// Now you can activate your custom tool
viewer.setActiveTool('mytool');
```

ビューア内のどこかをクリックするとメッセージが表示されます。

### 例: マウスホイールに応じて、表示する断面図の位置を変更する機能を追加

`wheelHandler` を変更して、表示する断面図の位置を変更する機能を追加してみます。ViewerEventTarget のメソッドに渡されるイベントデータの中で、重要なのは、 `original` プロパティと `viewer` プロパティです。  

`original`プロパティ  
: Viewerによってラップされている HTMLCanvaElement が受け取った生のイベントが格納されます。

`viewer`プロパティ  
: イベントの発火元となった Viewer インスタンスです。

Viewer インスタンスが取得出来れば、`getState()`,`setState()`を利用して描画設定の変更をしたり、`setAnnotation()` を利用してアノテーションを加えたり、あるいは既存のアノテーションを変更したりできます。

```javascript
class MyCustomTool extends circusrs.Tool {
    wheelHandler(viewerEvent) {
        const viewer = viewerEvent.viewer;
        const state = viewer.getState();
        const step = -Math.sign(viewerEvent.original.deltaY);
        const src = viewer.composition.imageSource;
        const voxelSize = src.voxelSize();
        state.section = circusrs.orientationAwareTranslation(state.section, voxelSize, step);
        viewer.setState(state);
    };
}
```

## 複数のツールを登録して、切り替えて使う

以下の例では、いくつかのカスタムツールを登録し、それらを切替えるための独自UIとして select DOM 要素の生成を行います。

JavaScript:

```js
circusrs.registerTool('mytool', MyCustomTool);

const toolList = ['mytool', 'hand', 'zoom', 'window'];
const toolSelector = document.createElement('select');
toolList.forEach(toolName => {
    const option = document.createElement('option');
    option.appendChild(document.createTextNode(toolName));
    toolSelector.appendChild(option);
});
toolSelector.addEventListener('change', function(){
    viewer.setActiveTool(toolList[this.selectedIndex]);
});

document.getElementById('tool-selector').appendChild(toolSelector);

viewer.setActiveTool(toolList[0]);
```

HTML:

```html
<div id="tool-selector"></div>
<div id="viewer"></div>
```
