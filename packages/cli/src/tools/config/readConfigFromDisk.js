/**
 * @flow
 *
 * Loads and validates a project configuration
 */
import Joi from 'joi';
import comsmiconfig from 'cosmiconfig';
import path from 'path';

import {
  type DependencyUserConfigT,
  type ProjectUserConfigT,
} from './types.flow';

import resolveReactNativePath from './resolveReactNativePath';
import getPackageConfiguration from '../getPackageConfiguration';

import * as schema from './schema';

/**
 * Places to look for the new configuration
 */
const searchPlaces = ['react-native.config.js', 'package.json'];

/**
 * Reads a project configuration as defined by the user in the current
 * workspace.
 */
export function readProjectConfigFromDisk(): ProjectUserConfigT {
  const explorer = comsmiconfig('react-native', {searchPlaces});

  const {config} = explorer.searchSync() || {config: {}};

  const result = Joi.validate(config, schema.projectUserConfig);

  if (result.error) {
    throw result.error;
  }

  return {
    ...result.value,
    reactNativePath: config.reactNativePath
      ? config.reactNativePath
      : resolveReactNativePath(),
  };
}

/**
 * Reads a dependency configuration as defined by the developer
 * inside `node_modules`.
 */
export function readDependencyConfigFromDisk(
  rootFolder: string,
): DependencyUserConfigT {
  const explorer = comsmiconfig('react-native', {
    stopDir: rootFolder,
    searchPlaces,
  });

  const {config} = explorer.searchSync(rootFolder) || {config: undefined};

  const result = Joi.validate(config, schema.dependencyUserConfig);

  if (result.error) {
    throw result.error;
  }

  return result.value;
}

/**
 * Reads a legacy configuaration from a `package.json` "rnpm" key.
 */
export function readLegacyDependencyConfigFromDisk(
  rootFolder: string,
): ?DependencyUserConfigT {
  const config = require(path.join(rootFolder, 'package.json')).rnpm;

  if (!config) {
    return undefined;
  }

  const transformedConfig = {
    dependency: {
      platforms: {
        ios: config.ios,
        android: config.android,
      },
      assets: config.assets,
      hooks: config.commands,
      params: config.params,
    },
    commands: [].concat(config.plugin || []),
    platforms: config.platform
      ? require(path.join(rootFolder, config.platform))
      : undefined,
  };

  const result = Joi.validate(transformedConfig, schema.dependencyUserConfig);

  if (result.error) {
    throw result.error;
  }

  return result.value;
}
