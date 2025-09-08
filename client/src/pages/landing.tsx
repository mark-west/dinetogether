import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center space-y-8 text-center">
        {/* Logo */}
        <div className="w-full bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl filter drop-shadow-lg">🍽️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              <span className="text-purple-600">DINE</span>
              <span className="text-pink-500">Together</span>
            </h2>
            <p className="text-sm text-gray-600 font-medium">Restaurant Coordination Platform</p>
          </div>
        </div>
        
        {/* Title & Description */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">
            DineTogether
          </h1>
          <p className="text-lg text-white/90 font-light leading-relaxed">
            Organize restaurant nights with friends. Create groups, plan dining events, and coordinate your culinary adventures.
          </p>
        </div>
        
        {/* Features */}
        <div className="w-full flex justify-center">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-users text-sm"></i>
              </div>
              <span className="text-base font-medium">Create dining groups</span>
            </div>
            
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-calendar text-sm"></i>
              </div>
              <span className="text-base font-medium">Plan restaurant visits</span>
            </div>
            
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-comments text-sm"></i>
              </div>
              <span className="text-base font-medium">Chat and coordinate</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="w-full pt-2">
          <Button 
            className="bg-white text-purple-600 hover:bg-gray-100 font-bold py-4 px-6 text-lg rounded-xl shadow-lg w-full"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
