import os

# Setup
env = Environment(ENV = os.environ)
try:
    env.Tool('config', toolpath = [os.environ.get('CBANG_HOME')])
except Exception as e:
    raise Exception('CBANG_HOME not set?\n' + str(e))

env.CBLoadTools('compiler resources dist cbang fah-client-version')
conf = env.CBConfigure()

# Version
env.FAHClientVersion()

# Config vars
env.Replace(RESOURCES_NS = 'FAH::WebClient')

# Packaging
if not env.GetOption('clean'):
    conf.CBConfig('compiler')
    conf.CBConfig('cbang')
    env.CBDefine('USING_CBANG') # Using CBANG macro namespace

conf.Finish()

# Resources
res = env.Resources('resources.cpp', ['#/src/fah/webclient'])
lib = env.Library('fah-web-client-resources', res)
Precious(lib)
Default(lib)

# Clean
Clean(lib, ['resources.data', 'config.log'])

# Dist
distfiles = ['README.md', 'LICENSE', 'src']
tar = env.TarBZ2Dist('FAHWebClient', distfiles)
Alias('dist', tar)
AlwaysBuild(tar)
