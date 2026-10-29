import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchJson } from '@/lib/api'
import type { Education, Profile } from '@/lib/types'

const EMPTY_PROFILE: Profile = {
  full_name: '',
  email: '',
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
    <div className="profile-layout"><Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="profile-form">
          <div className="grid gap-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...field('full_name')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...field('email')} />
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
            {profile.education.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">Add your degree, school, and graduation year to include them in your resume.</p>}
            {profile.education.map((ed, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2">
                <Input
                  placeholder="Degree"
                  aria-label={`Degree for education entry ${i + 1}`}
                  value={ed.degree}
                  onChange={(e) => updateEducation(i, { degree: e.target.value })}
                />
                <Input
                  placeholder="School"
                  aria-label={`School for education entry ${i + 1}`}
                  value={ed.school}
                  onChange={(e) => updateEducation(i, { school: e.target.value })}
                />
                <Input
                  placeholder="Year"
                  aria-label={`Year for education entry ${i + 1}`}
                  value={ed.year}
                  onChange={(e) => updateEducation(i, { year: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove education entry ${i + 1}`} onClick={() => removeEducation(i)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEducation} className="w-fit">
              <Plus aria-hidden="true" />Add education
            </Button>
          </fieldset>

          <Button type="submit" disabled={saving} className="w-fit">
            <Save aria-hidden="true" />{saving ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </CardContent>
    </Card><aside className="profile-guide"><FileText aria-hidden="true" /><h2>The details behind every application</h2><p>Your contact information and education are used when generating your resume and cover letter. Keep them up to date here.</p><h3>Let your experience do the talking</h3><p>Add your roles, projects, and achievements in Work history. You can choose which entries to include for each application.</p></aside></div>
  )
}
