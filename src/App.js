import React, { useState, useEffect } from 'react';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import './App.css';

const initialGraph = (stations) => [
  {
    id: 'main',
    name: stations[0] || 'Main Node',
    color: '#e0e0e0',
    notes: '',
    children: [
      {
        id: 'child-1',
        name: stations[1] || 'Child 1',
        color: '#455EED',
        notes: '',
        children: [
          {
            id: 'subchild-1-1',
            name: stations[2] || 'Subchild 1-1',
            color: '#455EED',
            notes: '',
            children: []
          },
          {
            id: 'subchild-1-2',
            name: stations[3] || 'Subchild 1-2',
            color: '#455EED',
            notes: '',
            children: []
          }
        ]
      },
      {
        id: 'child-2',
        name: stations[4] || 'Child 2',
        color: '#F7AFE7',
        notes: '',
        children: [
          {
            id: 'subchild-2-1',
            name: stations[5] || 'Subchild 2-1',
            color: '#F7AFE7',
            notes: '',
            children: []
          },
          {
            id: 'subchild-2-2',
            name: stations[6] || 'Subchild 2-2',
            color: '#F7AFE7',
            notes: '',
            children: []
          }
        ]
      },
      {
        id: 'child-3',
        name: stations[7] || 'Child 3',
        color: '#FFCF25',
        notes: '',
        children: []
      }
    ],
    childrenHidden: false
  }
];

const loadGraph = () => {
  const savedGraph = localStorage.getItem('graph');
  if (!savedGraph) {
    return [];
  }
  const parsedGraph = JSON.parse(savedGraph);
  return parsedGraph.length > 0 ? parsedGraph : [];
};

const saveGraph = (graph) => {
  localStorage.setItem('graph', JSON.stringify(graph));
};

const saveNodeNote = (id, newNote) => {
  const savedGraph = localStorage.getItem('graph');
  if (!savedGraph) return;
  
  const graph = JSON.parse(savedGraph);
  const updateNote = (nodes) => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, notes: newNote };
      } else if (node.children) {
        return { ...node, children: updateNote(node.children) };
      }
      return node;
    });
  };
  const updatedGraph = updateNote(graph);
  localStorage.setItem('graph', JSON.stringify(updatedGraph));
  
  // Helper function to collect notes
  const collectNotes = (nodes) => {
    let notesList = [];
    nodes.forEach(node => {
      notesList.push(`Node: ${node.id}, Notes: ${node.notes}`);
      if (node.children) {
        notesList = notesList.concat(collectNotes(node.children));
      }
    });
    return notesList;
  };

  const allNotes = collectNotes(updatedGraph);
  console.log("Saving note for node to localStorage:");
  console.log(allNotes.join('\n'));
};

const fetchStations = async (latitude, longitude) => {
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${latitude},${longitude})[public_transport=station];out;`;
  const response = await fetch(url);
  const data = await response.json();
  return data.elements
    .map(element => element.tags.name)
    .filter(name => name && name.split(' ').length <= 3);
};

const App = () => {
  const [nodes, setNodes] = useState(loadGraph());
  const [selectedNode, setSelectedNode] = useState(null);
  const [editorContent, setEditorContent] = useState({});
  const [history, setHistory] = useState([]);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [stations, setStations] = useState([]);
  const [usedColors, setUsedColors] = useState([]);

  useEffect(() => {
    if (nodes.length === 0) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const fetchedStations = await fetchStations(latitude, longitude);
        setStations(fetchedStations);
        const initialNodes = initialGraph(fetchedStations);
        setNodes(initialNodes);
        saveGraph(initialNodes);
        // Record the initial state only once
        setHistory([JSON.parse(JSON.stringify(initialNodes))]);
      }, () => {
        const defaultStations = ['Main Station', 'Child Station 1', 'Child Station 2', 'Child Station 3'];
        setStations(defaultStations);
        const initialNodes = initialGraph(defaultStations);
        setNodes(initialNodes);
        saveGraph(initialNodes);
        // Record the initial state only once
        setHistory([JSON.parse(JSON.stringify(initialNodes))]);
      });
    } else {
      // Ensure the initial state is added to the history stack
      if (history.length === 0) {
        setHistory([JSON.parse(JSON.stringify(nodes))]);
      }
    }
  }, [nodes]);

  const updateNodeProperty = (id, property, value) => {
    const updateNodes = (nodes) => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, [property]: value };
        } else if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    const updatedNodes = updateNodes(nodes);
    setNodes(updatedNodes);

    if (property === 'notes') {
      saveNodeNote(id, value);
    } else {
      saveGraph(updatedNodes);
    }

    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, [property]: value });
    }

    setEditorContent(prev => ({
      ...prev,
      [id]: { ...prev[id], [property]: value }
    }));

    updateHistory(updatedNodes);
  };

  const updateGraph = (newNodes, significant = false) => {
    setNodes(newNodes);
    saveGraph(newNodes);
    if (significant) {
      setHistory(prevHistory => {
        const newHistory = [...prevHistory, JSON.parse(JSON.stringify(newNodes))];
        if (newHistory.length > 10) newHistory.shift(); // Limit to 10 history items
        return newHistory;
      });
    }
  };

  const updateHistory = (newNodes, significant = false) => {
    if (significant) {
      setHistory(prevHistory => {
        const newHistory = [...prevHistory, JSON.parse(JSON.stringify(newNodes))];
        if (newHistory.length > 10) newHistory.shift(); // Keep only the last 10 states
        return newHistory;
      });
    }
  };

  const handleDetachNode = (nodeId) => {
    const detachNode = (nodes) => {
      let nodeToDetach = null;
      const updatedNodes = nodes.map(node => {
        if (node.children) {
          const filteredChildren = node.children.filter(child => {
            if (child.id === nodeId) {
              nodeToDetach = child;
              return false; // Remove the child from its parent
            }
            return true;
          });
  
          return { ...node, children: filteredChildren };
        }
        return node;
      });
  
      if (nodeToDetach) {
        // Set default color to indicate top-level node
        nodeToDetach.color = '#e0e0e0';
        updatedNodes.push(nodeToDetach); // Add it to the top-level nodes
      }
      return updatedNodes;
    };
  
    const updatedNodes = detachNode(nodes);
    setNodes(updatedNodes);
    updateGraph(updatedNodes, true); // Mark as a significant change
  };

  const handleSignificantChange = (newNodes) => {
    // Ensure that the first change saves the initial state to history
    if (history.length === 1) {
      setHistory(prevHistory => [...prevHistory, JSON.parse(JSON.stringify(nodes))]);
    }
    updateGraph(newNodes, true); // Mark this as a significant change
  };
  

  const undoAction = () => {
    setHistory(prevHistory => {
      if (prevHistory.length <= 1) return prevHistory;
      const lastState = prevHistory[prevHistory.length - 2];
      setNodes(lastState);
      saveGraph(lastState);
      return prevHistory.slice(0, -1);
    });
  };

  return (
    <div className="app-container">
      <div className={`graph-container ${isEditorVisible ? '' : 'full-width'}`}>
        <GraphComponent
          nodes={nodes}
          setNodes={setNodes}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          editorContent={editorContent}
          setEditorContent={setEditorContent}
          isEditorVisible={isEditorVisible}
          setIsEditorVisible={setIsEditorVisible}
          stations={stations}
          setStations={setStations}
          usedColors={usedColors}
          setUsedColors={setUsedColors}
          updateGraph={updateGraph}
          undoAction={undoAction}
        />
      </div>
      <EditorComponent
        selectedNode={selectedNode}
        handleDetachNode={handleDetachNode} // Pass the handleDetachNode function
        updateNodeProperty={(id, property, value) => {
          const updatedNodes = nodes.map(node => node.id === id ? { ...node, [property]: value } : node);
          updateGraph(updatedNodes, property !== 'notes'); // Significant change if not just notes
        }}
        isOpen={isEditorVisible}
        setIsOpen={setIsEditorVisible}
      />
      <div className="accent-bar"></div>
    </div>
  );
};

export default App;