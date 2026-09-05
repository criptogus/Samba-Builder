import { getGithubUser } from "../handlers/github_handlers";

export interface GitAuthor {
  name: string;
  email: string;
}

export async function getGitAuthor(): Promise<GitAuthor> {
  const user = await getGithubUser();
  const author = user
    ? {
        name: "Samba Builder",
        email: user.email,
      }
    : {
        name: "Samba Builder",
        email: "git@dyad.sh",
      };
  return author;
}
