import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoImage from "@assets/fulllogo_1756675026225.png";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="mx-auto w-80 bg-white rounded-2xl p-6 shadow-lg">
            <img 
              src={logoImage} 
              alt="DineTogether Logo" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
              Gather. Feast. Repeat.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light">
              Organize restaurant nights with friends. Create groups, plan dining events, and coordinate your culinary adventures.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-users text-xl"></i>
              </div>
              <CardTitle className="text-center">Create Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/80 text-center">
                Form dining groups with friends and family. Organize by location, cuisine preference, or social circle.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-calendar-plus text-xl"></i>
              </div>
              <CardTitle className="text-center">Plan Events</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/80 text-center">
                Schedule restaurant visits, track RSVPs, and get recommendations from your group members.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-comments text-xl"></i>
              </div>
              <CardTitle className="text-center">Chat & Coordinate</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-white/80 text-center">
                Stay connected with group and event chats. Share photos, plan details, and coordinate logistics.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="mt-12">
          <Button 
            size="lg" 
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg rounded-full shadow-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started with DineTogether
          </Button>
          <p className="text-white/70 text-sm mt-3">
            Sign in to start organizing dining events with your friends
          </p>
        </div>
      </div>
    </div>
  );
}
