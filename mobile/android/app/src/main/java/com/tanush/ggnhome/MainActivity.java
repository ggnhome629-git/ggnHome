package com.tanush.ggnhome;

import android.content.Context;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private AudioManager audio;
    private AudioManager.OnModeChangedListener modeListener;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    /**
     * The AI voice assistant is a conversation, not a phone call. The WebView switches the
     * phone into call mode when the microphone opens (other media ducked, voice through the
     * earpiece); put it straight back so audio keeps playing normally through the speaker.
     */
    private void keepNormalAudio() {
        if (audio != null && audio.getMode() != AudioManager.MODE_NORMAL) {
            audio.setMode(AudioManager.MODE_NORMAL);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        keepNormalAudio();
        if (audio != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && modeListener == null) {
            modeListener = mode -> {
                if (mode != AudioManager.MODE_NORMAL) keepNormalAudio();
            };
            audio.addOnModeChangedListener(getMainExecutor(), modeListener);
        }
    }

    @Override
    public void onPause() {
        // Tell the page the app is going to the background so the AI voice stops and the mic is released.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript("window.dispatchEvent(new Event('ggn-app-pause'))", null);
        }
        if (audio != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && modeListener != null) {
            audio.removeOnModeChangedListener(modeListener);
            modeListener = null;
        }
        super.onPause();
    }

    @Override
    public void onStop() {
        super.onStop();
        // Never leave the phone in call mode after the app is closed.
        keepNormalAudio();
    }
}
