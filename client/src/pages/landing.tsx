import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-auto text-center space-y-6">
        {/* Logo */}
        <div className="mx-auto w-24 h-24 bg-purple-900 rounded-full flex items-center justify-center mb-6">
          <div className="text-white text-2xl">
            <i className="fas fa-utensils"></i>
          </div>
        </div>
        
        {/* Brand Name */}
        <div>
          <h1 className="text-2xl font-bold text-purple-900 mb-2">DINETOGETHER</h1>
          <p className="text-gray-600 text-sm">Organize dining events with friends</p>
        </div>

        {/* Features */}
        <div className="space-y-4 text-left">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="fas fa-users text-purple-600 text-sm"></i>
            </div>
            <span className="text-gray-700">Create dining groups</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="fas fa-calendar text-purple-600 text-sm"></i>
            </div>
            <span className="text-gray-700">Plan restaurant visits</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="fas fa-comments text-purple-600 text-sm"></i>
            </div>
            <span className="text-gray-700">Chat and coordinate</span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-4">
          <Button 
            className="w-full bg-purple-900 hover:bg-purple-800 text-white font-semibold py-3 rounded-md"
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
