;; router.clar
(define-trait dex-trait
  ((swap-exact-tokens-for-tokens 
    (uint uint principal principal) 
    (response uint uint))
   (get-amount-out 
    (uint principal principal) 
    (response uint uint))))

(define-map allowed-dexes principal bool)
(define-map routes 
  { token-in: principal, token-out: principal }
  { dex: principal, path: (list 10 principal) })

;; Fonction principale de swap
(define-public (swap-tokens
    (amount-in uint)
    (min-amount-out uint)
    (token-in principal)
    (token-out principal)
    (recipient principal))
  (let ((route (get-best-route amount-in token-in token-out)))
    (try! (execute-swap route amount-in min-amount-out recipient))
    (ok true)))