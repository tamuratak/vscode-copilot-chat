/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { URI } from '../../../util/vs/base/common/uri';
import { IChatInstructionsService } from '../common/chatInstructionsService';

export class ChatInstructionsService implements IChatInstructionsService {
	declare readonly _serviceBrand: undefined;

	async getInstructions(): Promise<readonly URI[]> {
		return (vscode.chat?.instructions ?? []).map(instruction => URI.revive(instruction.uri));
	}
}