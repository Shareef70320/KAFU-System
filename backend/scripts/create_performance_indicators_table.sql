-- Create competency_performance_indicators table
CREATE TABLE IF NOT EXISTS competency_performance_indicators (
  id TEXT PRIMARY KEY,
  element_id TEXT NOT NULL,
  action TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT competency_performance_indicators_element_id_fkey 
    FOREIGN KEY (element_id) 
    REFERENCES competency_elements(id) 
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_performance_indicators_element_id ON competency_performance_indicators(element_id);
CREATE INDEX IF NOT EXISTS idx_performance_indicators_order ON competency_performance_indicators("order");

-- Add comment
COMMENT ON TABLE competency_performance_indicators IS 'Performance indicators (actions/tasks) for each competency element that can be checked and measured';

