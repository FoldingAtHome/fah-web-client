from SCons.Script import *


def configure(conf):
    env = conf.env
    home = env.CBCheckHome()
    if home: env.AppendUnique(LIBPATH = [home])
    conf.CBRequireLib('FAHWebClientResources')


def generate(env):
    env.CBAddConfigTest(configure)
    env.CBLoadTools('cbang')

def exists():
    return True
