from SCons.Script import *


def configure(conf):
    env = conf.env
    conf.CBCheckHome('fah-web-client', lib_suffix = '')
    conf.CBRequireLib('fah-web-client-resources')


def generate(env):
    env.CBAddConfigTest('fah-web-client', configure)
    env.CBLoadTools('cbang')


def exists():
    return True
