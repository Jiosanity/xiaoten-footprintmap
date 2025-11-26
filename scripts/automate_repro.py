from playwright.sync_api import sync_playwright
import time, os, json

os.makedirs('screenshots', exist_ok=True)
log_path = os.path.join('scripts', 'network_log.txt')
# open log file for append (overwrite each run)
logf = open(log_path, 'w', encoding='utf-8')
def write_log(line):
    try:
        logf.write(line + '\n')
        logf.flush()
    except Exception:
        pass

with sync_playwright() as pw:
    # Launch in headful mode with a small slowMo to make interactions observable
    browser = pw.chromium.launch(headless=False, slow_mo=60)
    context = browser.new_context(viewport={"width":1280, "height":900})

    # If a MAPBOX_TOKEN is provided via environment, inject it into localStorage
    # and as a global override before any page scripts run. Also persist provider.
    token = os.environ.get('MAPBOX_TOKEN')
    if token:
        # Use json.dumps to safely escape the token into a JS string literal
        token_js = json.dumps(token)
        # Register an init script directly (no temporary file) so it runs before page scripts
        try:
            init_script = (
                f"try{{ localStorage.setItem('MAPBOX_TOKEN', {token_js}); }}catch(e){{}}\n"
                f"try{{ window.__MAPBOX_TOKEN_OVERRIDE = {token_js}; }}catch(e){{}}\n"
                "try{ localStorage.setItem('footprintmap_builder_provider','mapbox'); }catch(e){}\n"
                "try{ console.log('INIT_INJECTED_MAPBOX_TOKEN_PRESENT'); }catch(e){}\n"
            )
            context.add_init_script(script=init_script)
        except Exception as e:
            write_log('Failed to add init script: ' + str(e))

    page = context.new_page()

    # capture console messages and detect adapter-ready
    adapter_ready = { 'v': False }
    def on_console(msg):
        line = f"CONSOLE [{msg.type}] {msg.text}"
        print(line)
        write_log(line)
        try:
            if 'MAPBOX_ADAPTER_READY' in msg.text:
                adapter_ready['v'] = True
        except Exception:
            pass
    page.on('console', on_console)

    # capture network events for debugging (requests/responses/requestfailed)
    status = { 'style_loaded': False, 'style_failed': False }
    max_style_retries = 5

    def on_request(req):
        url = req.url
        if 'mapbox' in url or 'amap' in url:
            try:
                line = f"REQUEST -> {req.method} {url}"
                print(line)
                write_log(line)
            except Exception:
                pass
    page.on('request', on_request)

    def on_request_failed(req):
        try:
            failure = req.failure
            reason = failure.error_text if failure else 'unknown'
            line = f"REQUEST FAILED -> {req.url} : {reason}"
            print(line)
            write_log(line)
            # detect Mapbox style failure
            try:
                if 'api.mapbox.com/styles/v1/mapbox/light-v10' in req.url:
                    status['style_failed'] = True
            except Exception:
                pass
        except Exception:
            try:
                line = f"REQUEST FAILED -> {req.url}"
                print(line)
                write_log(line)
            except:
                pass
    page.on('requestfailed', on_request_failed)

    def on_response(resp):
        try:
            url = resp.url
            resp_status = resp.status
            if 'mapbox' in url or 'amap' in url or resp_status >= 400:
                info = f"RESPONSE <- {resp_status} {url}"
                print(info)
                write_log(info)
                # try to fetch a small body snippet for Mapbox/Amap responses
                try:
                    text = resp.text()
                    if text:
                        snippet = text[:800].replace('\n','\\n')
                        sline = 'RESPONSE BODY SNIPPET: ' + snippet
                        print(sline)
                        write_log(sline)
                except Exception as e:
                    line = 'RESPONSE BODY READ FAILED: ' + str(e)
                    print(line)
                    write_log(line)
            # detect Mapbox style successful response
            try:
                if 'api.mapbox.com/styles/v1/mapbox/light-v10' in url and resp_status == 200:
                    status['style_loaded'] = True
            except Exception:
                pass
        except Exception:
            pass
    page.on('response', on_response)

    url = 'http://127.0.0.1:8000/editor.html'
    print('Navigating to', url)
    page.goto(url, timeout=60000)
    # debug: show what token is present in localStorage at page start
    try:
        token_local = page.evaluate("() => { try{ return localStorage.getItem('MAPBOX_TOKEN'); }catch(e){ return null;} }")
        token_override = page.evaluate("() => { try{ return window.__MAPBOX_TOKEN_OVERRIDE || null; }catch(e){ return null;} }")
        print('localStorage MAPBOX_TOKEN at load:', token_local)
        print('window.__MAPBOX_TOKEN_OVERRIDE at load:', token_override)
    except Exception as _:
        pass
    page.wait_for_selector('#providerSelect', timeout=15000)

    # ensure saved provider value persists
    try:
        print('Selecting Mapbox provider')
        page.select_option('#providerSelect', 'mapbox')
        # persist by invoking change handler
        page.evaluate("(function(){ const sel=document.getElementById('providerSelect'); sel.dispatchEvent(new Event('change')); })()")
    except Exception as e:
        print('Select provider failed:', e)

    # refresh to reproduce the refresh behavior
    print('Reloading page to test persistence...')
    page.reload()
    page.wait_for_load_state('networkidle')
    time.sleep(1)

    # If Mapbox style failed to load, attempt limited retries (transient network issue)
    retries = 0
    if (not status['style_loaded']) and status['style_failed']:
        backoff = 1
        while retries < max_style_retries and (not status['style_loaded']):
            retries += 1
            msg = f"Mapbox style not loaded; retrying page reload {retries}/{max_style_retries}... backoff={backoff}s"
            print(msg)
            write_log(msg)
            page.reload()
            page.wait_for_load_state('networkidle')
            time.sleep(backoff)
            backoff = min(backoff * 2, 8)
            # if style_loaded becomes True via response handler, loop will exit
        if status['style_loaded']:
            print('Mapbox style loaded after retry')
            write_log('Mapbox style loaded after retry')
        else:
            print('Mapbox style still not loaded after retries')
            write_log('Mapbox style still not loaded after retries')

    # wait for preview map area to initialize
    print('Waiting for preview map canvas...')
    try:
        page.wait_for_selector('.footprint-map__canvas, .footprint-map', timeout=20000)
    except Exception as e:
        print('Preview not ready:', e)

    # Ensure we have data in the editor: click the "导入示例数据" button (it inserts sample locations)
    try:
        # Handle any alert/confirm dialogs by accepting them so automation isn't blocked
        def on_dialog(dialog):
            try:
                line = f"DIALOG [{dialog.type}] {dialog.message}"
                print(line)
                write_log(line)
            except Exception:
                pass
            try:
                dialog.accept()
            except Exception:
                try:
                    dialog.dismiss()
                except Exception:
                    pass
        page.on('dialog', on_dialog)

        print('Looking for 导入示例数据 button...')
        write_log('Looking for 导入示例数据 button...')
        # locate the button by its visible text
        try:
            import_btn = page.locator("button:has-text('导入示例数据')")
            import_btn.wait_for(timeout=5000)
            import_btn.click()
            print('Clicked 导入示例数据')
            write_log('Clicked 导入示例数据')
            # wait for the location list to populate
            page.wait_for_selector('.location-item', timeout=10000)
            print('Sample locations loaded')
            write_log('Sample locations loaded')
        except Exception as e:
            print('Import sample data button not found or click failed:', e)
            write_log('Import sample data button not found or click failed: ' + str(e))
    except Exception as e:
        print('Import sample data flow error:', e)
        write_log('Import sample data flow error: ' + str(e))

    # wait for adapter-ready console signal (set by mapbox adapter)
    print('Waiting for MAPBOX_ADAPTER_READY console marker...')
    waited = 0
    wait_max = 20
    while waited < wait_max and (not adapter_ready['v']):
        time.sleep(1)
        waited += 1
    if adapter_ready['v']:
        print('Adapter ready signal received')
        write_log('Adapter ready signal received')
    else:
        print('Adapter ready signal not seen; continuing anyway')
        write_log('Adapter ready signal not seen; continuing anyway')

    # screenshot initial state
    page.screenshot(path='screenshots/initial.png')
    print('Saved screenshots/initial.png')

    # try to click a marker inside the preview map (下方预览地图)
    try:
        selector = '#previewMap .footprint-marker'
        page.wait_for_selector(selector, timeout=15000)
        print('Clicking first preview marker')
        write_log('Clicking first preview marker')
        page.click(selector)
        time.sleep(0.8)
        page.screenshot(path='screenshots/after_click_marker.png')
        print('Saved screenshots/after_click_marker.png')
    except Exception as e:
        print('No preview marker clicked or marker not found:', e)
        write_log('No preview marker clicked or marker not found: ' + str(e))

    # if popup images exist, click the first image
    try:
        img = page.query_selector('.footprint-popup__photos img')
        if img:
            print('Clicking popup image')
            img.click()
            time.sleep(0.6)
            page.screenshot(path='screenshots/popup_image_clicked.png')
            print('Saved screenshots/popup_image_clicked.png')
    except Exception as e:
        print('No popup image or click failed:', e)

    # try filters
    try:
        # Close any open photo viewer that could intercept pointer events
        try:
            viewer = page.query_selector('.footprint-photo-viewer.is-visible')
            mask = page.query_selector('.footprint-photo-viewer__mask')
            close_btn = page.query_selector('.footprint-photo-viewer__close, .footprint-photo-viewer .close')
            if close_btn:
                print('Closing photo viewer via close button')
                write_log('Closing photo viewer via close button')
                close_btn.click()
                time.sleep(0.4)
            elif mask:
                try:
                    print('Clicking photo viewer mask to dismiss')
                    write_log('Clicking photo viewer mask to dismiss')
                    mask.click()
                    time.sleep(0.4)
                except Exception:
                    # fallback to ESC key
                    print('Mask click failed, sending Escape')
                    page.keyboard.press('Escape')
                    time.sleep(0.4)
            elif viewer:
                # no obvious controls: press Escape
                print('Photo viewer visible; sending Escape')
                write_log('Photo viewer visible; sending Escape')
                page.keyboard.press('Escape')
                time.sleep(0.4)
        except Exception as e:
            print('Error while attempting to close photo viewer:', e)
            write_log('Error while attempting to close photo viewer: ' + str(e))

        # Then click a non-all filter button inside the footprint map
        btn = page.query_selector('.footprint-map__filter-btn:not([data-filter="all"])')
        if btn:
            print('Clicking a filter button')
            btn.click()
            time.sleep(1)
            page.screenshot(path='screenshots/after_filter.png')
            print('Saved screenshots/after_filter.png')
        else:
            print('No filter button found (single category)')
    except Exception as e:
        print('Filter test failed:', e)

    # collect some console logs and page errors
    errs = page.evaluate('() => window.__playwright_errors || []')
    print('Collected page errors (if any):', errs)

    browser.close()
    print('Done')
