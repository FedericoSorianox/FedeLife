export interface AuthResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
}

export interface User {
    login: string;
    id: number;
    avatarUrl: string;
    htmlUrl: string;
    name?: string;
    email?: string;
    bio?: string;
}