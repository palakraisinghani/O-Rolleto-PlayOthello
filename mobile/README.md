# Android app

The same Svelte UI as the desktop app and the web page, wrapped in a native Android shell by [Capacitor](https://capacitorjs.com). **Oroletto plays on the phone**: the 1.8 MB network (`models/oroletto-8x8.onnx`) runs in the app's web view with `onnxruntime-web` (WebAssembly), driven by a TypeScript port of the PUCT search (`ui/src/lib/engine/oroletto.ts`) that reproduces OthelloRL's visit counts exactly (`npm test` checks all 50 fixture positions). The four levels use the manifest's temperatures, as on the desktop. No network is needed, and no model distillation: the network is small enough as it is. If the model ever failed to load, the app would fall back to the classic bots.

## Get the apps (no store, no developer account)

Push a version tag and GitHub builds the app for you (`.github/workflows/android.yml`):

```bash
git tag v0.2.0 && git push origin v0.2.0
```

The **Releases** page then offers:

- `Othello-Player-android.apk`: open it on an Android phone and allow the install.

You can also run the workflow by hand from the repository's **Actions** tab; the files then appear as run artifacts.

## Build it yourself

```bash
cd ui && npm install && cd ../mobile && npm install
npm run web                # builds ui/dist-mobile (the UI + Oroletto + the WebAssembly runtime)
npx cap sync               # copies it into android/
npx cap open android       # Android Studio (needs the Android SDK and a JDK)
```

`npm run web` alone is enough to try the phone build in a desktop browser: serve `ui/dist-mobile` with any static server.

Icons are generated from `app/icon-source.png` with `npx capacitor-assets generate --android --iconBackgroundColor '#1b0f08'` (already done).
