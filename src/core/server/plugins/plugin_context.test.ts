/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { duration } from 'moment';
import { first } from 'rxjs/operators';
import { REPO_ROOT } from '@osd/dev-utils';
import { createPluginInitializerContext, InstanceInfo } from './plugin_context';
import { CoreContext } from '../core_context';
import { Env } from '../config';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { rawConfigServiceMock, getEnvOptions } from '../config/mocks';
import { PluginManifest } from './types';
import { Server } from '../server';
import { fromRoot } from '../utils';
import { ByteSizeValue } from '@osd/config-schema';

const logger = loggingSystemMock.create();

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;
let server: Server;
let instanceInfo: InstanceInfo;

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    opensearchDashboardsVersion: '7.0.0',
    requiredPlugins: ['some-required-dep'],
    requiredEnginePlugins: {
      'test-os-plugin1': '^2.2.1',
    },
    requiredBundles: [],
    optionalPlugins: ['some-optional-dep'],
    server: true,
    ui: true,
    ...manifestProps,
  };
}

describe('createPluginInitializerContext', () => {
  beforeEach(async () => {
    coreId = Symbol('core');
    instanceInfo = {
      uuid: 'instance-uuid',
    };
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    const config$ = rawConfigServiceMock.create({ rawConfig: {} });
    server = new Server(config$, env, logger);
    await server.setupCoreConfig();
    coreContext = { coreId, env, logger, configService: server.configService };
  });

  it('should return a globalConfig handler in the context', async () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const pluginInitializerContext = createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    );

    expect(pluginInitializerContext.config.legacy.globalConfig$).toBeDefined();

    const configObject = await pluginInitializerContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    expect(configObject).toStrictEqual({
      opensearchDashboards: {
        index: '.kibana',
        configIndex: '.opensearch_dashboards_config',
        autocompleteTerminateAfter: duration(100000),
        autocompleteTimeout: duration(1000),
      },
      opensearch: {
        shardTimeout: duration(30, 's'),
        requestTimeout: duration(30, 's'),
        pingTimeout: duration(30, 's'),
      },
      path: { data: fromRoot('data') },
      savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
    });
  });

  it('allow to access the provided instance uuid', () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    instanceInfo = {
      uuid: 'opensearch-dashboards-uuid',
    };
    const pluginInitializerContext = createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest,
      instanceInfo
    );
    expect(pluginInitializerContext.env.instanceUuid).toBe('opensearch-dashboards-uuid');
  });
});
