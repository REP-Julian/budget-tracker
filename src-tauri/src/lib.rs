#[tauri::command]
fn open_in_external_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        // Call Kotlin MainActivity.openExternalUrl(url) via ndk_context
        let ctx = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) }
            .map_err(|e| format!("failed to get JavaVM: {e}"))?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|e| format!("failed to attach thread: {e}"))?;

        let activity_class = env.find_class("com/julian/budgettracker/MainActivity")
            .map_err(|e| format!("failed to find MainActivity: {e}"))?;
        let url_str = env.new_string(&url)
            .map_err(|e| format!("failed to create url string: {e}"))?;

        env.call_static_method(
            activity_class,
            "openExternalUrl",
            "(Ljava/lang/String;)V",
            &[jni::objects::JValue::Object(&url_str.into())],
        ).map_err(|e| format!("failed to call openExternalUrl: {e}"))?;

        Ok(())
    }
    #[cfg(not(target_os = "android"))]
    {
        tauri_plugin_opener::open_url(url, None::<&str>)
            .map_err(|e| format!("failed to open url: {e}"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![open_in_external_browser])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
