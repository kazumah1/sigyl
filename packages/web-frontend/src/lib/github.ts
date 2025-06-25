export async function fetchRepos(token: string) {
    return await fetch("https://api.github.com/user/repos", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json())
  }
  