"use client"

import { useActionState } from "react"
import {
  createClientWithCase,
  type CreateClientState,
} from "@/app/admin/actions"
import { BOROUGHS, CLIENT_TRACKS } from "@/config/stages"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function NewClientForm() {
  const [state, action, pending] = useActionState<CreateClientState, FormData>(
    createClientWithCase,
    {}
  )

  return (
    <Card className="max-w-xl">
      <form action={action}>
        <CardHeader>
          <CardTitle>New client</CardTitle>
          <CardDescription>
            Creates a client, opens a case at the Lead stage, and seeds the full checklist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="borough">Borough</Label>
              {/* Native select keeps this submittable inside the form action. */}
              <select
                id="borough"
                name="borough"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                defaultValue=""
              >
                <option value="">—</option>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="track">Track</Label>
              <select
                id="track"
                name="track"
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                defaultValue="resident"
              >
                {CLIENT_TRACKS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="createAccount" name="createAccount" />
            <Label htmlFor="createAccount" className="text-sm font-normal">
              Create a portal account (needs an email; invite sent once email is enabled)
            </Label>
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create client & open case"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
