import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchJson } from '@/lib/api'
import type { Education, Profile } from '@/lib/types'

const EMPTY_PROFILE: Profile = {
  full_name: '',
  phone: '',
  address: '',
  github_url: '',
  linkedin_url: '',
  portfolio_url: '',
  education: [],
}

export function ProfileTab() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchJson<Profile>('/api/profile').then(setProfile)
  }, [])

  function field(name: keyof Profile) {
    return {
      value: profile[name] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, [name]: e.target.value }),
    }
  }

  function updateEducation(index: number, patch: Partial<Education>) {
    const education = profile.education.map((ed, i) => (i === index ? { ...ed, ...patch } : ed))
    setProfile({ ...profile, education })
  }

  function addEducation() {
    setProfile({ ...profile, education: [...profile.education, { degree: '', school: '', year: '' }] })
  }

  function removeEducation(index: number) {
    setProfile({ ...profile, education: profile.education.filter((_, i) => i !== index) })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await fetchJson<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(profile) })
      setProfile(saved)
      toast.success('Profile saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...field('full_name')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...field('phone')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...field('address')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="github_url">GitHub URL</Label>
            <Input id="github_url" type="url" placeholder="https://github.com/..." {...field('github_url')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input id="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." {...field('linkedin_url')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="portfolio_url">Portfolio URL</Label>
            <Input id="portfolio_url" type="url" {...field('portfolio_url')} />
          </div>

          <fieldset className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Education</legend>
            {profile.education.map((ed, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2">
                <Input
                  placeholder="Degree"
                  value={ed.degree}
                  onChange={(e) => updateEducation(i, { degree: e.target.value })}
                />
                <Input
                  placeholder="School"
                  value={ed.school}
                  onChange={(e) => updateEducation(i, { school: e.target.value })}
                />
                <Input
                  placeholder="Year"
                  value={ed.year}
                  onChange={(e) => updateEducation(i, { year: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => removeEducation(i)}>
                  &times;
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEducation} className="w-fit">
              + Add education entry
            </Button>
          </fieldset>

          <Button type="submit" disabled={saving} className="w-fit">
            Save Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
