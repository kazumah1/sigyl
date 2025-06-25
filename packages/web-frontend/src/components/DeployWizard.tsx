const [repos, setRepos] = useState([])
useEffect(() => {
  fetch('/api/github/repos').then(res => res.json()).then(setRepos)
}, [])

return (
  <select onChange={e => setSelectedRepo(e.target.value)}>
    {repos.map(r => <option value={r.full_name}>{r.full_name}</option>)}
  </select>
)
