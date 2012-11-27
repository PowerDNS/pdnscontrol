
import pdnscontrol
pdnscontrol.app.debug = True
pdnscontrol.asset_env.debug = pdnscontrol.app.debug
pdnscontrol.app.run(use_debugger=True, use_reloader=True, debug=pdnscontrol.app.debug, host='0.0.0.0')

