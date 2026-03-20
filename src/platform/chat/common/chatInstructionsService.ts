/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { URI } from '../../../util/vs/base/common/uri';

export const IChatInstructionsService = createServiceIdentifier<IChatInstructionsService>('IChatInstructionsService');

export interface IChatInstructionsService {
	readonly _serviceBrand: undefined;

	getInstructions(): Promise<readonly URI[]>;
}