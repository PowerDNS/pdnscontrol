
import camel
camel.app.debug = True
camel.asset_env.debug = camel.app.debug
camel.app.run(use_debugger=True, use_reloader=True, debug=camel.app.debug, host='0.0.0.0')

