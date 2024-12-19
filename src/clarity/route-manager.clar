;; route-manager.clar
(define-map path-details
  { token-in: principal, token-out: principal }
  { paths: (list 5 (list 10 principal)),
    dexes: (list 5 principal) })

(define-public (add-route
    (token-in principal)
    (token-out principal)
    (path (list 10 principal))
    (dex principal))
  (begin
    (asserts! (is-admin tx-sender) (err u1))
    (map-set routes 
      { token-in: token-in, token-out: token-out }
      { dex: dex, path: path })
    (ok true)))

(define-read-only (get-best-route
    (amount-in uint)
    (token-in principal)
    (token-out principal))
  (let ((possible-routes (get-routes token-in token-out)))
    (find-best-price amount-in possible-routes)))