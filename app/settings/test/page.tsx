'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNewProject } from '@/lib/actions/projects';
import { createNewItem, completeItem } from '@/lib/actions/items';
import { getMasterList } from '@/lib/actions/masterlist';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message: string;
  duration?: number;
}

export default function TestPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updateResult = (name: string, status: TestResult['status'], message: string, duration?: number) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, status, message, duration } : r);
      }
      return [...prev, { name, status, message, duration }];
    });
  };

  const handleCreate1000Items = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setTotal(1000);
    setCurrentTest('Creating 1000 Test Items');
    setResults([]);
    setLogs([]);
    
    const startTime = Date.now();
    
    try {
      addLog('Starting test: Create 1000 items');
      
      // Create test project
      addLog('Creating test project...');
      const projectResult = await createNewProject('🧪 Test Project 1000', 3);
      
      if (!projectResult.success || !projectResult.projectId) {
        throw new Error('Failed to create test project');
      }
      
      addLog(`✓ Test project created: ${projectResult.projectId}`);
      
      // Create 1000 items
      addLog('Creating 1000 items...');
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 1; i <= 1000; i++) {
        try {
          await createNewItem(`Test Item #${i}`, projectResult.projectId);
          successCount++;
          setProgress(i);
          
          if (i % 100 === 0) {
            addLog(`Progress: ${i}/1000 items created`);
          }
        } catch (error) {
          failCount++;
          addLog(`✗ Failed to create item ${i}: ${error}`);
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (successCount / parseFloat(duration)).toFixed(2);
      
      addLog(`✓ Test completed in ${duration}s`);
      addLog(`✓ Success: ${successCount}, Failed: ${failCount}`);
      addLog(`✓ Average rate: ${rate} items/second`);
      
      updateResult(
        'Create 1000 Items',
        failCount === 0 ? 'success' : 'failed',
        `Created ${successCount}/1000 items in ${duration}s (${rate} items/sec)`,
        parseFloat(duration)
      );
      
    } catch (error) {
      addLog(`✗ Test failed: ${error}`);
      updateResult('Create 1000 Items', 'failed', `Error: ${error}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const handleCompleteAllItems = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setCurrentTest('Completing All Items');
    setLogs([]);
    
    const startTime = Date.now();
    
    try {
      addLog('Starting test: Complete all items');
      
      // Get master list
      addLog('Fetching master list...');
      const { data: masterList } = await getMasterList();
      
      if (!masterList || masterList.length === 0) {
        throw new Error('Master list is empty');
      }
      
      setTotal(masterList.length);
      addLog(`Found ${masterList.length} items to complete`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < masterList.length; i++) {
        try {
          await completeItem(1); // Always complete position 1
          successCount++;
          setProgress(i + 1);
          
          if ((i + 1) % 50 === 0) {
            addLog(`Progress: ${i + 1}/${masterList.length} items completed`);
          }
        } catch (error) {
          failCount++;
          addLog(`✗ Failed to complete item at position ${i + 1}: ${error}`);
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (successCount / parseFloat(duration)).toFixed(2);
      
      addLog(`✓ Test completed in ${duration}s`);
      addLog(`✓ Success: ${successCount}, Failed: ${failCount}`);
      addLog(`✓ Average rate: ${rate} items/second`);
      
      updateResult(
        'Complete All Items',
        failCount === 0 ? 'success' : 'failed',
        `Completed ${successCount}/${masterList.length} items in ${duration}s (${rate} items/sec)`,
        parseFloat(duration)
      );
      
    } catch (error) {
      addLog(`✗ Test failed: ${error}`);
      updateResult('Complete All Items', 'failed', `Error: ${error}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const handleTestAllFeatures = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setTotal(6);
    setCurrentTest('Testing All Features');
    setResults([]);
    setLogs([]);
    
    const tests = [
      {
        name: 'Create Projects',
        fn: async () => {
          addLog('Test 1: Creating projects with different priorities...');
          for (let priority = 1; priority <= 5; priority++) {
            const result = await createNewProject(`🧪 Test Project P${priority}`, priority as 1 | 2 | 3 | 4 | 5);
            if (!result.success) throw new Error(`Failed to create project with priority ${priority}`);
          }
          addLog('✓ Created 5 projects with priorities 1-5');
        }
      },
      {
        name: 'Add Errands',
        fn: async () => {
          addLog('Test 2: Adding errand items...');
          for (let i = 1; i <= 10; i++) {
            const result = await createNewItem(`🧪 Test Errand ${i}`, null);
            if (!result.success) throw new Error(`Failed to create errand ${i}`);
          }
          addLog('✓ Created 10 errand items');
        }
      },
      {
        name: 'Add Project Items',
        fn: async () => {
          addLog('Test 3: Adding project items...');
          const projectResult = await createNewProject('🧪 Test Project Items', 3);
          if (!projectResult.success || !projectResult.projectId) throw new Error('Failed to create project');
          
          for (let i = 1; i <= 5; i++) {
            const result = await createNewItem(`🧪 Project Item ${i}`, projectResult.projectId);
            if (!result.success) throw new Error(`Failed to create project item ${i}`);
          }
          addLog('✓ Created project with 5 items');
        }
      },
      {
        name: 'Complete Items',
        fn: async () => {
          addLog('Test 4: Completing items...');
          for (let i = 1; i <= 5; i++) {
            await completeItem(1);
          }
          addLog('✓ Completed 5 items successfully');
        }
      },
      {
        name: 'Master List Check',
        fn: async () => {
          addLog('Test 5: Checking master list...');
          const { data: masterList } = await getMasterList();
          if (!masterList) throw new Error('Failed to fetch master list');
          addLog(`✓ Master list has ${masterList.length} items`);
        }
      },
      {
        name: 'Performance Check',
        fn: async () => {
          addLog('Test 6: Performance check...');
          const start = Date.now();
          for (let i = 1; i <= 10; i++) {
            await createNewItem(`🧪 Perf Test ${i}`, null);
          }
          const duration = Date.now() - start;
          const rate = (10000 / duration).toFixed(2);
          addLog(`✓ Created 10 items in ${duration}ms (${rate} items/sec)`);
        }
      }
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const startTime = Date.now();
      
      try {
        await test.fn();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        updateResult(test.name, 'success', `Passed in ${duration}s`, parseFloat(duration));
        setProgress(i + 1);
      } catch (error) {
        addLog(`✗ ${test.name} failed: ${error}`);
        updateResult(test.name, 'failed', `Error: ${error}`);
        setProgress(i + 1);
      }
    }
    
    setIsRunning(false);
    setCurrentTest('');
    addLog('✓ All feature tests completed');
  };

  const handleClearLogs = () => {
    setLogs([]);
    setResults([]);
    setProgress(0);
    setTotal(0);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🧪 Test & Validation Tools</h1>
        <p className="page-subtitle">
          ⚠️ For Testing Only - This page can be removed after testing
        </p>
      </div>

      {/* Performance Tests */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">📊 Performance Tests</h2>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleCreate1000Items}
            disabled={isRunning}
            className="btn-primary"
            style={{ marginRight: '0.5rem' }}
          >
            {isRunning && currentTest.includes('1000') ? 'Creating...' : 'Create 1000 Test Items'}
          </button>
          
          <button
            onClick={handleCompleteAllItems}
            disabled={isRunning}
            className="btn-success"
          >
            {isRunning && currentTest.includes('Completing') ? 'Completing...' : 'Complete All Items'}
          </button>
        </div>

        {isRunning && total > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
              {currentTest}: {progress}/{total}
            </div>
            <div style={{ 
              width: '100%', 
              height: '30px', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(progress / total) * 100}%`,
                height: '100%',
                backgroundColor: '#4caf50',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {((progress / total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Feature Tests */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">🧪 Feature Tests</h2>
        </div>
        
        <button
          onClick={handleTestAllFeatures}
          disabled={isRunning}
          className="btn-primary"
        >
          {isRunning && currentTest.includes('Features') ? 'Testing...' : 'Test All Features'}
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Test Results:</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx}>
                      <td><strong>{result.name}</strong></td>
                      <td>
                        {result.status === 'success' && <span style={{ color: '#28a745' }}>✓ PASS</span>}
                        {result.status === 'failed' && <span style={{ color: '#dc3545' }}>✗ FAIL</span>}
                        {result.status === 'running' && <span style={{ color: '#ffc107' }}>⏳ Running</span>}
                        {result.status === 'pending' && <span style={{ color: '#6c757d' }}>⏸ Pending</span>}
                      </td>
                      <td>{result.message}</td>
                      <td>{result.duration ? `${result.duration}s` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Logs */}
      {logs.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">📝 Test Logs</h2>
            <button onClick={handleClearLogs} className="btn-sm btn-secondary">
              Clear Logs
            </button>
          </div>
          
          <div style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '1rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '0.25rem' }}>
                {log}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation */}
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => router.push('/settings')}
          className="btn-secondary"
          disabled={isRunning}
        >
          ← Back to Settings
        </button>
      </div>

      {/* Instructions */}
      <section className="section" style={{ marginTop: '2rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
        <h3 style={{ marginBottom: '1rem', color: '#856404' }}>📖 Instructions</h3>
        <ul style={{ marginLeft: '1.5rem', color: '#856404' }}>
          <li><strong>Create 1000 Items:</strong> Creates a test project with 1000 items to test performance</li>
          <li><strong>Complete All Items:</strong> Completes all items in the master list one by one</li>
          <li><strong>Test All Features:</strong> Runs comprehensive tests on all app features</li>
        </ul>
      </section>
    </div>
  );
}

