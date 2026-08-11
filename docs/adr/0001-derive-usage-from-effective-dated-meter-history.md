# Derive usage from effective-dated meter history

The system treats entered printer counters as cumulative Meter Readings and
derives usage between consecutive readings. Device assignments, transfers,
meter resets, deduction policy, contracts, and effective prices are preserved
with their effective times so usage and cost remain attributable to the context
in force when they occurred; this replaces mutable-current-value reporting,
which would rewrite history after a move or billing change.
