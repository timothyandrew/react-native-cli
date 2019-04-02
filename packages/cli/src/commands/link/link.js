/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {pick} from 'lodash';
import dedent from 'dedent';

import {type ContextT} from '../../tools/types.flow';

import promiseWaterfall from './promiseWaterfall';
import logger from '../../tools/logger';
import commandStub from './commandStub';
import promisify from './promisify';

import linkDependency from './linkDependency';
import linkAssets from './linkAssets';
import linkAll from './linkAll';

type FlagsType = {
  platforms?: Array<string>,
};

/**
 * Updates project and links all dependencies to it.
 *
 * @param args If optional argument [packageName] is provided,
 *             only that package is processed.
 */
function link([rawPackageName]: Array<string>, ctx: ContextT, opts: FlagsType) {
  let platforms = ctx.platforms;
  let project = ctx.project;

  if (opts.platforms) {
    platforms = pick(platforms, opts.platforms);
  }

  if (rawPackageName === undefined) {
    logger.debug(
      'No package name provided, will attemp to link all possible packages.',
    );
    return linkAll(ctx, platforms);
  }

  // Trim the version / tag out of the package name (eg. package@latest)
  const packageName = rawPackageName.replace(/^(.+?)(@.+?)$/gi, '$1');

  if (!Object.keys(ctx.dependencies).includes(packageName)) {
    throw new Error(dedent`
      Unknown dependency. 
      
      Make sure that the package you are trying to link is already installed
      in your "node_modules" and present in your "package.json" dependencies.
    `);
  }

  const {[packageName]: dependency} = ctx.dependencies;

  logger.debug(`Package to link: ${rawPackageName}`);

  const tasks = [
    () => promisify(dependency.hooks.prelink || commandStub),
    () => linkDependency(platforms, project, dependency),
    () => promisify(dependency.hooks.postlink || commandStub),
    () => linkAssets(platforms, project, dependency.assets),
  ];

  return promiseWaterfall(tasks).catch(err => {
    throw new Error(dedent`
      Something went wrong while linking. Reason: ${err.message}

      Please file an issue here: https://github.com/react-native-community/react-native-cli/issues
    `);
  });
}

export const func = link;

export default {
  func: link,
  description: 'scope link command to certain platforms (comma-separated)',
  name: 'link [packageName]',
  options: [
    {
      command: '--platforms [list]',
      description:
        'If you want to link dependencies only for specific platforms',
      parse: (val: string) => val.toLowerCase().split(','),
    },
  ],
};
