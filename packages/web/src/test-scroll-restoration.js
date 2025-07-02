// Simple test to verify scroll restoration functionality
// This can be run in the browser console to test the scroll behavior

function testScrollRestoration() {
  console.log('Testing scroll restoration...');
  
  // Simulate scrolling down
  window.scrollTo(0, 1000);
  console.log('Scrolled down to position:', window.scrollY);
  
  // Simulate route change by triggering the scroll restoration
  setTimeout(() => {
    // This simulates what happens in the useEffect
    const html = document.documentElement;
    const body = document.body;
    const originalHtmlScrollBehavior = html.style.scrollBehavior;
    const originalBodyScrollBehavior = body.style.scrollBehavior;
    
    html.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    
    window.scrollTo(0, 0);
    
    console.log('After scroll restoration, position:', window.scrollY);
    
    setTimeout(() => {
      html.style.scrollBehavior = originalHtmlScrollBehavior;
      body.style.scrollBehavior = originalBodyScrollBehavior;
      console.log('Scroll behavior restored');
    }, 100);
  }, 1000);
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testScrollRestoration = testScrollRestoration;
}

export { testScrollRestoration };