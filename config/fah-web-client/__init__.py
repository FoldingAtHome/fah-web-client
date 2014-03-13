from SCons.Script import *
import config

deps = ['cbang']


def configure(conf):
    env = conf.env
    if home: env.AppendUnique(LIBPATH = [home])
    config.require_lib(conf, 'FAHWebClientResources')
