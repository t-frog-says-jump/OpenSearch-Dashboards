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

// @ts-expect-error
import fetchMock from 'fetch-mock/es5/client';
import { loadingServiceMock } from './http_service.test.mocks';

import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { HttpService } from './http_service';
import { Observable } from 'rxjs';

describe('interceptors', () => {
  afterEach(() => fetchMock.restore());

  it('shares interceptors across setup and start', async () => {
    fetchMock.get('*', {});
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();

    const setup = httpService.setup({ fatalErrors, injectedMetadata });
    const setupInterceptor = jest.fn();
    setup.intercept({ request: setupInterceptor });

    const start = httpService.start();
    const startInterceptor = jest.fn();
    start.intercept({ request: startInterceptor });

    await setup.get('/blah');
    expect(setupInterceptor).toHaveBeenCalledTimes(1);
    expect(startInterceptor).toHaveBeenCalledTimes(1);

    await start.get('/other-blah');
    expect(setupInterceptor).toHaveBeenCalledTimes(2);
    expect(startInterceptor).toHaveBeenCalledTimes(2);
  });
});

describe('#setup()', () => {
  it('registers Fetch#getLoadingCount$() with LoadingCountSetup#addLoadingCountSource()', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    httpService.setup({ fatalErrors, injectedMetadata });
    const loadingServiceSetup = loadingServiceMock.setup.mock.results[0].value;
    // We don't verify that this Observable comes from Fetch#getLoadingCount$() to avoid complex mocking
    expect(loadingServiceSetup.addLoadingCountSource).toHaveBeenCalledWith(expect.any(Observable));
  });

  it('setup basePath without workspaceId provided in window.location.href', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    const setupResult = httpService.setup({ fatalErrors, injectedMetadata });
    expect(setupResult.basePath.get()).toEqual('');
  });

  it('setup basePath with workspaceId provided in window.location.href', () => {
    const windowSpy = jest.spyOn(window, 'window', 'get');
    windowSpy.mockImplementation(
      () =>
        ({
          location: {
            href: 'http://localhost/w/workspaceId/app',
          },
        } as any)
    );
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    const setupResult = httpService.setup({ fatalErrors, injectedMetadata });
    expect(setupResult.basePath.get()).toEqual('/w/workspaceId');
    windowSpy.mockRestore();
  });
});

describe('#stop()', () => {
  it('calls loadingCount.stop()', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const httpService = new HttpService();
    httpService.setup({ fatalErrors, injectedMetadata });
    httpService.start();
    httpService.stop();
    expect(loadingServiceMock.stop).toHaveBeenCalled();
  });
});
