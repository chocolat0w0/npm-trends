# npm-trends

[NPM 公式](https://www.npmjs.com/) のパッケージ情報ではダウンロード数情報が表示されていないパッケージがあり、[npm trends](https://npmtrends.com/) でも確認できないため API データからダウンロード数比較グラフを作成する。

- React+Typescriptで記述する。
- パッケージ名を入力する欄がある。
- 入力するとそのパッケージのダウンロード数を `https://api.npmjs.org/downloads/range/last-year/${パッケージ名}$` から取得する。
- 日付推移のグラフを作成する。
- パッケージは追加で指定すると同じグラフ内に別の色で描画する。
- 表示パッケージは削除可能。
- パッケージのダウンロード情報が取得できない場合は `{"error":"package ${パッケージ名} not found"}` が返ってくるので、エラー表示する。

