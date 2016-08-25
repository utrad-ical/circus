---
title: Hints
---

# Hints

## 複数のビューアの利用について

`Link` の仕組みを通じて複数のビューアの連携を実装予定（未実装）。

## 独自のImageSourceを実装する

独自の ImageSource がやるべき最低限の仕事は、 ViewState を受け取ってこれを元にキャンバスの描画を行う処理を `draw()` メソッドに記述することです。

`draw()` はノンブロッキングに動作し、描画処理の完了は Promise によって通知してください。Promise によって描画が終了した時点で、ビューアは次にコンポジションに関連づけられている各種アノテーションの描画処理に入ります。

[DynamicImageSource]: #DynamicImageSource
[SectionUtil]: #SectionUtil
