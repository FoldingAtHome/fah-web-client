import os

# Setup
env = Environment()
try:
    env.Tool('config', toolpath = [os.environ.get('CBANG_HOME')])
except Exception, e:
    raise Exception, 'Have you set CBANG_HOME?\n' + str(e)

env.CBLoadTools('compiler resources dist cbang')
conf = env.CBConfigure()

# Version
version = open('version/version.txt', 'r').read().strip()
major, minor, revision = version.split('.')

# Config vars
env.Replace(PACKAGE_VERSION = version)
env.Replace(RESOURCES_NS = 'FAH::WebClient')

# Packaging
if not env.GetOption('clean'):
    conf.CBConfig('compiler')
    conf.CBConfig('cbang')
    env.CBDefine('USING_CBANG') # Using CBANG macro namespace

conf.Finish()

# Resources
res = env.Resources('resources.cpp', ['#/src/fah/webclient'])
lib = env.Library('FAHWebClientResources', res)
Precious(lib)
Default(lib)

# Clean
Clean(lib, ['resources.data', 'config.log'])

# Dist
distfiles = ['README', 'ChangeLog', 'copyright', 'src']
tar = env.TarBZ2Dist('FAHWebClient', distfiles)
Alias('dist', tar)
AlwaysBuild(tar)
