import { Button } from "@/client/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/client/components/ui/card"
import { Input } from "@/client/components/ui/input"
import { Label } from "@/client/components/ui/label"
import { Textarea } from "@/client/components/ui/textarea"
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from "react"
import "../styles/form.css"

export default function RunningPlanGenerator() {
  const navigate = useNavigate()
  const [mileage, setMileage] = useState("")
  const [race, setRace] = useState("")
  const [targetTime, setTargetTime] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [weeklyTime, setWeeklyTime] = useState("")
  const [aboutYou, setAboutYou] = useState("")
  
  useEffect(() => {
    // Retrieve form data from localStorage on component mount
    const storedFormData = localStorage.getItem('runningPlanFormData');
    if (storedFormData) {
      const formData = JSON.parse(storedFormData);
      setMileage(formData.mileage || "");
      setRace(formData.race || "");
      setTargetTime(formData.targetTime || "");
      setAdditionalInfo(formData.additionalInfo || "");
      setWeeklyTime(formData.weeklyTime || "");
      setAboutYou(formData.aboutYou || "");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Store form data in localStorage before submitting
    localStorage.setItem('runningPlanFormData', JSON.stringify({
      mileage,
      race,
      targetTime,
      weeklyTime,
      additionalInfo,
      aboutYou
    }));

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mileage,
          race,
          targetTime,
          weeklyTime,
          additionalInfo,
          aboutYou
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit running plan request')
      }

      const data = await response.json() as { success: boolean, id: string }
      navigate({ to: '/chat/$planId', params: { planId: data.id } })
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Failed to submit running plan request. Please try again.')
    }
  }

  return (
    <Card className="form-card">
      <CardHeader className="form-header">
        <CardDescription className="form-description">
          Fill in your details to get a personalized running plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="form-content">
        <div className="form-field">
            <Label htmlFor="about-you">About you</Label>
            <Input
              id="about-you"
              placeholder="I'm 26 years old. I used to cycle about 3 times a week. I'm looking to get into running."
              value={aboutYou}
              onChange={(e) => setAboutYou(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="mileage">How much do you run per week?</Label>
            <Input
              id="mileage"
              placeholder="5k once or twice a week. Sometimes a longer run of 10k"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="race">Do you have a specific race in mind? When is it?</Label>
            <Input
              id="race"
              placeholder="Road marathon on 1st of June"
              value={race}
              onChange={(e) => setRace(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="target-time">What is your target race time?</Label>
            <Input
              id="target-time"
              placeholder="3 hours 30 minutes, would be awesome but idk."
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="weekly-time">How many hours per week do you plan to train?</Label>
            <Input
              id="weekly-time"
              placeholder="I have 3 hours to train per week. Maybe more in the spring when it gets warmer."
              value={weeklyTime}
              onChange={(e) => setWeeklyTime(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="additionalInfo">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              placeholder="Any injuries, days you can't run, or other relevant information"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={4}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="form-footer">
        <Button type="submit" className="submit-button" onClick={handleSubmit}>
          Generate Running Plan
        </Button>
      </CardFooter>
    </Card>
  )
}