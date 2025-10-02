import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock, Video } from "lucide-react";

export default function MeetingRoom() {
  const upcomingMeetings = [
    {
      id: 1,
      title: "Product Strategy Discussion",
      advisors: ["Business Advisor", "Finance Advisor"],
      date: "2025-10-05",
      time: "2:00 PM",
      duration: "60 min",
    },
    {
      id: 2,
      title: "Technical Architecture Review",
      advisors: ["Technical Advisor", "Operations Advisor"],
      date: "2025-10-06",
      time: "10:00 AM",
      duration: "45 min",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Meeting Room</h1>
        <p className="text-muted-foreground">Schedule and manage meetings with your AI advisors</p>
      </div>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-blue text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            AI Advisor Conference Room
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Host virtual meetings with all 5 AI advisors simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button className="w-full gradient-blue" size="lg">
            <Video className="mr-2 h-5 w-5" />
            Start New Meeting
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Upcoming Meetings</h2>
        <div className="grid gap-4">
          {upcomingMeetings.map((meeting) => (
            <Card key={meeting.id} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-semibold">{meeting.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {meeting.advisors.map((advisor) => (
                        <Badge key={advisor} variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {advisor}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {meeting.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {meeting.time}
                      </span>
                      <Badge variant="outline">{meeting.duration}</Badge>
                    </div>
                  </div>
                  <Button variant="outline">Join</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting History</CardTitle>
          <CardDescription>View recordings and transcripts of past meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No past meetings yet. Start your first meeting to see history here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
