import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('lint', () => {
  it('runs lint cmd', async () => {
    const {stdout} = await runCommand('lint')
    expect(stdout).to.contain('hello world')
  })

  it('runs lint --name oclif', async () => {
    const {stdout} = await runCommand('lint --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
