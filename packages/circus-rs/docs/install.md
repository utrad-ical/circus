---
title: Install
---

# Install

## 動作環境

### サーバ

Windows, Linux共通

- Node.js (4.x以上)
- 3Dボリュームをメモリ上にキャッシュする必要があるため、RAMは十分に必要です。

### クライアント（ブラウザ）

- 現時点ではモダンブラウザ (Chrome, Firefox または Microsoft Edge）が必須。
- RawVolumeImageSource または HybridImageSource を使う場合には3次元ボリュームを利用するため、かなりのメモリが使用されます。最低でもシステムのRAMが8GB以上あるデスクトップOSでの利用が推奨されます。

## 前提知識

CIRCUS RS での開発にあたって JavaScript および HTML の知識が必要です。特に ES2015 の Promise や class を広汎に利用しているため、これらの利用方法について精通している必要があります。

以下のチュートリアルでは「アロー関数構文」「短いプロパティ名」「let/const」などの ES2015 の言語機能を利用していますが、これらの利用は必須ではありません。

CIRCUS RS 内部の拡張をするのでない限り、 HTML Canvas の扱いや DICOM 画像フォーマットについての詳細な知識は不要です。

CIRCUR RS は JavaScript の世界での標準的なモジュールリポジトリである NPM を通じて公開されます。このため、 Node.js および NPM のインストールと、これらに関する基本的な知識が必要です。

## CIRCUS RSのインストール

### Webpack/Browserifyを使った開発（推奨）

CIRCUS RS のシステムは CommonJS 方式のモジュールを使って構造化されています。CIRCUS RS は CommonJS モジュールに対応したビルドシステムを使って開発者のアプリケーションに組み込むことができ、これが2016年時点で最も近代的な方法です。 Babel や TypeScript などのトランスパイラを組み合わせることで、いわゆる ES6 modules を使った開発も可能です。詳細はそれぞれのプロジェクトのドキュメントを参照してください。

```js
// Import using ES6 style modules
import { Viewer } from 'circus-rs/viewer/viewer';

// Or using traditional commonJS style
var Viewer = require('circus-rs/viewer/viewer').Viewer;
```

### ビルド・結合済み `.js` ファイルのインクルード

HTMLファイル内でビルド済みファイルを読み込みます。

```html
<!-- Loading pre-bundled CIRCUS RS script -->
<script src="circus-rs-client.js"></script>
<script>
// your code here
</script>
```

これにより `circusrs` という名前空間内にすべての CIRCUS RS のクラス・APIが公開されます。（例: Viewer クラスは `circusrs.Viewer`）
