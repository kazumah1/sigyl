import { Octokit } from '@octokit/rest'

export async function getUserRepos(token: string) {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.rest.repos.listForAuthenticatedUser()
  return data
}
