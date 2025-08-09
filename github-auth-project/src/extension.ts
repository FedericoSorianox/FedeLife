import * as vscode from 'vscode';
import { GitHubAuth } from './auth/githubAuth';

export function activate(context: vscode.ExtensionContext) {
    const githubAuth = new GitHubAuth();

    let disposable = vscode.commands.registerCommand('extension.loginToGitHub', async () => {
        try {
            const token = await githubAuth.authenticate();
            vscode.window.showInformationMessage('Successfully logged in to GitHub!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to log in to GitHub: ' + error.message);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}