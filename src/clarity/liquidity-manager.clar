;; liquidity-manager.clar
(define-map pool-liquidity
  { dex: principal, token-a: principal, token-b: principal }
  { liquidity: uint, last-update: uint })

(define-read-only (check-liquidity
    (dex principal)
    (token-a principal)
    (token-b principal)
    (amount uint))
  (let ((pool-info (get-pool-liquidity dex token-a token-b)))
    (>= (get liquidity pool-info) amount)))

(define-public (update-liquidity
    (dex principal)
    (token-a principal)
    (token-b principal)
    (new-liquidity uint))
  (begin
    (asserts! (is-authorized tx-sender) (err u1))
    (map-set pool-liquidity
      { dex: dex, token-a: token-a, token-b: token-b }
      { liquidity: new-liquidity, last-update: block-height })
    (ok true)))