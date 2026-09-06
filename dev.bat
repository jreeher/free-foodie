@echo off
set ANDROID_HOME=C:\Users\jreeh\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=C:\Users\jreeh\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%

cd /d "C:\Users\jreeh\Dropbox\Simmer Down"

echo Setting up USB tunnel...
adb reverse tcp:8081 tcp:8081

echo Launching Simmer Down on phone...
adb shell monkey -p com.simmerdown.app -c android.intent.category.LAUNCHER 1

echo Starting Metro...
npx expo start
pause
