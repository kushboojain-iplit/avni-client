package com.openchsclient;

import android.content.Intent;

import com.example.abha_create_verify.MainActivity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;


public class Module extends ReactContextBaseJavaModule {

    Module(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "Module";
    }

    @ReactMethod
    public void invoke(String authToken, ReadableArray existingABHANumbers, String url) {
        ReactApplicationContext reactApplicationContext = getReactApplicationContext();

        int size = existingABHANumbers.size();
        String[] stringArray = new String[size];
        for (int i = 0; i < size; i++) {
            stringArray[i] = existingABHANumbers.getString(i);
        }

        Intent intent = new Intent(reactApplicationContext, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("sessionToken", authToken);
        intent.putExtra("hipBaseURL", url);
        intent.putExtra("existingABHANumbers", stringArray);
        reactApplicationContext.startActivity(intent);
    }
}