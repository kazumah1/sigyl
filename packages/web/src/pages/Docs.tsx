import PageHeader from '@/components/PageHeader';
import React from 'react';

const HEADER_HEIGHT = 80; // px, adjust if your header is a different height

const Docs = () => {
  return (
    <>
    <PageHeader />
    <div style={{ width: '100vw', height: `calc(100vh - ${HEADER_HEIGHT}px)`, marginTop: HEADER_HEIGHT, background: 'black' }}>
      <iframe
        src="https://docs.sigyl.dev"
        title="SIGYL Docs"
        style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
      />
    </div>
    </>
  );
};

export default Docs;
